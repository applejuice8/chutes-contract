import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverAuth";
import { saveAnalysis } from "@/lib/db";
import {
  generateNonce,
  sha256HexBuffer,
  fetchTEEEvidence,
  buildReceipt,
  TEEEvidence,
} from "@/lib/teeAttestation";

// The 6-agent TEE pipeline can run for minutes. On Vercel, a function is killed
// at its maxDuration. 300s is the max for Hobby (with Fluid Compute enabled) and
// a safe default for Pro/Enterprise (which can go higher). Keep
// CHUTES_AGENT_TIMEOUT_MS comfortably below this so a single slow agent fails
// gracefully instead of the whole function being terminated by the platform.
export const maxDuration = 300;

// Inference (OpenAI-compatible chat completions) lives on the llm.* host.
// The api.* host is management/billing/OAuth only and returns 403 for inference.
const CHUTES_LLM_API = "https://llm.chutes.ai/v1";
const MODEL = process.env.CHUTES_MODEL ?? "deepseek-ai/DeepSeek-V3.2-TEE";
// Derive chute name from model for evidence endpoint (use model string directly)
const CHUTE_ID = process.env.CHUTES_CHUTE_ID || MODEL;
// Optional server-side fallback credential if the OAuth token lacks invoke scope.
const FALLBACK_API_KEY = process.env.CHUTES_API_KEY;
// Per-agent-call timeout. TEE models are slow (~10 tok/s), so allow generous
// time but never hang forever. Override with CHUTES_AGENT_TIMEOUT_MS.
const AGENT_TIMEOUT_MS = Number(process.env.CHUTES_AGENT_TIMEOUT_MS) || 240_000;

/** Timestamped logger so progress is visible in the server console. */
function makeLogger(requestId: string) {
  const start = Date.now();
  return (msg: string) => {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[analyze ${requestId}] +${elapsed}s ${msg}`);
  };
}

async function callChutesOnce(
  token: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  signal: AbortSignal
): Promise<Response> {
  return fetch(`${CHUTES_LLM_API}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
    signal,
  });
}

async function callChutesAgent(
  accessToken: string,
  stage: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  log: (msg: string) => void
): Promise<string> {
  log(`${stage}: starting (input ${userMessage.length} chars)`);
  const stageStart = Date.now();

  // Abort the request if it exceeds the timeout instead of hanging forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    let res = await callChutesOnce(
      accessToken,
      systemPrompt,
      userMessage,
      maxTokens,
      controller.signal
    );

    // If the user's OAuth token isn't authorized for inference, fall back to the
    // server-side API key (if configured) so the analysis can still complete.
    if (
      (res.status === 401 || res.status === 403) &&
      FALLBACK_API_KEY &&
      FALLBACK_API_KEY !== accessToken
    ) {
      log(
        `${stage}: OAuth token rejected (${res.status}); retrying with server CHUTES_API_KEY`
      );
      res = await callChutesOnce(
        FALLBACK_API_KEY,
        systemPrompt,
        userMessage,
        maxTokens,
        controller.signal
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Chutes agent failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;
    const usage = data.usage ?? {};
    const secs = ((Date.now() - stageStart) / 1000).toFixed(1);
    log(
      `${stage}: done in ${secs}s (prompt ${usage.prompt_tokens ?? "?"} / completion ${usage.completion_tokens ?? "?"} tokens, output ${content?.length ?? 0} chars)`
    );
    return content;
  } catch (err) {
    const secs = ((Date.now() - stageStart) / 1000).toFixed(1);
    if (err instanceof Error && err.name === "AbortError") {
      log(`${stage}: TIMED OUT after ${secs}s (limit ${AGENT_TIMEOUT_MS}ms)`);
      throw new Error(
        `${stage} timed out after ${secs}s. The TEE model may be cold or overloaded.`
      );
    }
    log(`${stage}: FAILED after ${secs}s — ${err instanceof Error ? err.message : err}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Strip markdown code fences if the model wraps JSON in them */
function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Parse JSON from an agent response, tolerating markdown fences. Returns the
 * provided fallback (and logs) if parsing fails, so one flaky agent can't take
 * down the whole pipeline.
 */
function safeParse<T>(
  raw: string,
  fallback: T,
  log: (m: string) => void,
  label: string
): T {
  try {
    return JSON.parse(stripFences(raw)) as T;
  } catch (e) {
    log(`failed to parse ${label}: ${e instanceof Error ? e.message : e}`);
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = makeLogger(requestId);
  log("request received");

  // 1. Auth gate
  const session = await getServerSession();
  if (!session || Date.now() > session.expiresAt) {
    log("rejected: not authenticated");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const accessToken = session.accessToken;

  // 2. Read file
  const formData = await req.formData();
  const file = formData.get("contract") as File | null;
  if (!file) {
    log("rejected: no file uploaded");
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const requestedAt = new Date().toISOString();
  const fileBuffer = await file.arrayBuffer();
  const contractText = new TextDecoder().decode(fileBuffer);
  log(`file "${file.name}" received (${contractText.length} chars), model=${MODEL}`);

  // 3. Hash the document BEFORE analysis (tamper-evidence)
  const contractHash = await sha256HexBuffer(fileBuffer);

  // 4. Generate nonce and start TEE evidence fetch in parallel with agent pipeline
  const nonce = generateNonce();
  log(`TEE evidence fetch started in parallel (chute ${CHUTE_ID})`);
  const fetchEvidenceWithFallback = async (): Promise<TEEEvidence[]> => {
    try {
      return await fetchTEEEvidence(accessToken, CHUTE_ID, nonce);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Retry with the server API key if the OAuth token can't read evidence.
      if (
        FALLBACK_API_KEY &&
        FALLBACK_API_KEY !== accessToken &&
        /\b(401|403)\b/.test(msg)
      ) {
        try {
          return await fetchTEEEvidence(FALLBACK_API_KEY, CHUTE_ID, nonce);
        } catch (err2) {
          log(
            `TEE evidence fetch failed with fallback key (non-fatal): ${err2 instanceof Error ? err2.message : err2}`
          );
          return [];
        }
      }
      log(`TEE evidence fetch failed (non-fatal): ${msg}`);
      return [];
    }
  };
  const evidencePromise: Promise<TEEEvidence[]> = fetchEvidenceWithFallback().then(
    (ev) => {
      log(`TEE evidence resolved: ${ev.length} instance(s)`);
      return ev;
    }
  );

  // Reusable agent runner bound to this request's token + logger.
  const run = (
    stage: string,
    system: string,
    input: string,
    maxTokens: number
  ) => callChutesAgent(accessToken, stage, system, input, maxTokens, log);

  try {
    // ── Phase 1: Parser + Extractor (parallel — both read the raw text) ──
    const [parserRaw, extractorRaw] = await Promise.all([
      run(
        "Stage 1/6 Document Parser",
        `You are a document parser for contracts. Identify the document's metadata.
Respond ONLY with valid JSON, no markdown fences:
{
  "contractType": "NDA" | "Employment" | "Vendor" | "Lease" | "Other",
  "parties": [{ "name": string, "role": string }],
  "governingLaw": string (jurisdiction / governing law, or "Not specified"),
  "effectiveDate": string (or "Not specified")
}`,
        contractText,
        700
      ),
      run(
        "Stage 2/6 Clause Extractor",
        `You are a clause extraction agent. Segment the contract into discrete, non-overlapping clauses.
Respond ONLY with valid JSON, no markdown fences:
{
  "clauses": [{
    "id": string (stable id like "c1", "c2", ...),
    "category": string (e.g. Payment Terms, Liability, IP Rights, Termination, Non-Compete, Confidentiality),
    "title": string (short label),
    "text": string (the clause text, kept concise but faithful)
  }]
}`,
        contractText,
        4096
      ),
    ]);

    const meta = safeParse<{
      contractType?: string;
      parties?: Array<{ name: string; role: string }>;
      governingLaw?: string;
      effectiveDate?: string;
    }>(parserRaw, {}, log, "parser");

    const extracted = safeParse<{
      clauses?: Array<{
        id?: string;
        category?: string;
        title?: string;
        text?: string;
      }>;
    }>(extractorRaw, { clauses: [] }, log, "extractor");

    // Canonical clause list — every downstream agent references these ids, and
    // we merge their outputs back in by id. This keeps payloads small and stops
    // the clause text from drifting between agents.
    interface Clause {
      id: string;
      category: string;
      title: string;
      text: string;
      riskLevel: "LOW" | "MEDIUM" | "HIGH";
      riskReason: string;
      plainEnglish: string;
      suggestedRewrite: string;
      negotiationPriority: string;
    }
    const clauses: Clause[] = (extracted.clauses ?? []).map((c, i) => ({
      id: c.id || `c${i + 1}`,
      category: c.category || "Clause",
      title: c.title || c.category || `Clause ${i + 1}`,
      text: c.text || "",
      riskLevel: "MEDIUM",
      riskReason: "",
      plainEnglish: "",
      suggestedRewrite: "",
      negotiationPriority: "OPTIONAL",
    }));
    const byId = new Map(clauses.map((c) => [c.id, c]));
    const contractType = meta.contractType || "Other";
    log(`extracted ${clauses.length} clauses; type=${contractType}`);

    // Compact digest passed to per-clause agents.
    const clauseDigest = JSON.stringify(
      clauses.map((c) => ({
        id: c.id,
        category: c.category,
        title: c.title,
        text: c.text,
      }))
    );

    // ── Phase 2: Risk Scorer + Plain-English Translator (parallel) ──
    const [scoresRaw, translationsRaw] = await Promise.all([
      run(
        "Stage 3/6 Risk Scorer",
        `You are a contract risk scorer. For EACH clause id, rate the risk to the party reviewing the contract.
Respond ONLY with valid JSON, no markdown fences:
{ "scores": [{ "id": string, "riskLevel": "LOW" | "MEDIUM" | "HIGH", "riskReason": string (one sentence) }] }`,
        clauseDigest,
        2048
      ),
      run(
        "Stage 4/6 Plain-English Translator",
        `You translate legal clauses into plain English for a non-lawyer. For EACH clause id, explain what it means in practice.
Respond ONLY with valid JSON, no markdown fences:
{ "translations": [{ "id": string, "plainEnglish": string }] }`,
        clauseDigest,
        2048
      ),
    ]);

    // Merge risk scores into the canonical clauses.
    const scores = safeParse<{
      scores?: Array<{ id: string; riskLevel?: string; riskReason?: string }>;
    }>(scoresRaw, { scores: [] }, log, "scorer");
    for (const s of scores.scores ?? []) {
      const c = byId.get(s.id);
      if (!c) continue;
      if (s.riskLevel === "LOW" || s.riskLevel === "MEDIUM" || s.riskLevel === "HIGH") {
        c.riskLevel = s.riskLevel;
      }
      if (s.riskReason) c.riskReason = s.riskReason;
    }

    // Merge plain-English translations.
    const translations = safeParse<{
      translations?: Array<{ id: string; plainEnglish?: string }>;
    }>(translationsRaw, { translations: [] }, log, "translator");
    for (const t of translations.translations ?? []) {
      const c = byId.get(t.id);
      if (c && t.plainEnglish) c.plainEnglish = t.plainEnglish;
    }

    // ── Phase 3: Negotiation Advisor (depends on risk scores) ──
    const scoredDigest = JSON.stringify(
      clauses.map((c) => ({
        id: c.id,
        category: c.category,
        title: c.title,
        text: c.text,
        riskLevel: c.riskLevel,
        riskReason: c.riskReason,
      }))
    );
    const adviceRaw = await run(
      "Stage 5/6 Negotiation Advisor",
      `You are a negotiation advisor. For EACH clause id, suggest concrete redline language to negotiate a better deal with the other party, plus a priority. Focus effort on higher-risk clauses.
Respond ONLY with valid JSON, no markdown fences:
{ "advice": [{ "id": string, "suggestedRewrite": string (or "No changes needed."), "negotiationPriority": "MUST_CHANGE" | "SHOULD_CHANGE" | "OPTIONAL" | "ACCEPT" }] }`,
      scoredDigest,
      2560
    );
    const advice = safeParse<{
      advice?: Array<{
        id: string;
        suggestedRewrite?: string;
        negotiationPriority?: string;
      }>;
    }>(adviceRaw, { advice: [] }, log, "advisor");
    for (const a of advice.advice ?? []) {
      const c = byId.get(a.id);
      if (!c) continue;
      if (a.suggestedRewrite) c.suggestedRewrite = a.suggestedRewrite;
      if (a.negotiationPriority) c.negotiationPriority = a.negotiationPriority;
    }

    // ── Phase 4: Summary Agent (sees the whole picture) ──
    const summaryInput = JSON.stringify({
      contractType,
      clauses: clauses.map((c) => ({
        id: c.id,
        category: c.category,
        riskLevel: c.riskLevel,
        riskReason: c.riskReason,
      })),
    });
    const summaryRaw = await run(
      "Stage 6/6 Summary Agent",
      `You are a contract summary agent. Given the analyzed clauses, produce a high-level verdict that wraps everything into a concise summary.
Respond ONLY with valid JSON, no markdown fences:
{
  "overallRisk": "GREEN" | "AMBER" | "RED",
  "summary": string (2-3 sentences),
  "keyRisks": [string] (top 3-5 risks),
  "topRecommendation": string (the single most important change to negotiate)
}
Base the verdict on: GREEN = mostly LOW risk, AMBER = several MEDIUM risks, RED = any HIGH-risk clause present.`,
      summaryInput,
      700
    );
    const summaryData = safeParse<Record<string, unknown>>(
      summaryRaw,
      {
        overallRisk: "AMBER",
        summary: "Analysis complete.",
        keyRisks: [],
        topRecommendation: "",
      },
      log,
      "summary"
    );

    // Await TEE evidence (was fetching in parallel since the start).
    log("all agent stages complete; awaiting TEE evidence");
    const evidence = await evidencePromise;

    // Build notarization receipt over every agent's raw output.
    const receipt = await buildReceipt({
      contractHash,
      analysisText: [
        parserRaw,
        extractorRaw,
        scoresRaw,
        translationsRaw,
        adviceRaw,
        summaryRaw,
      ].join("\n"),
      modelId: MODEL,
      chuteId: CHUTE_ID,
      nonce,
      evidence,
      requestedAt,
    });

    log(
      `complete — ${clauses.length} clauses, risk=${
        summaryData.overallRisk ?? "AMBER"
      }, TEE=${receipt.tdxQuote !== "unavailable" ? "verified" : "unavailable"}`
    );

    const analysis = {
      id: receipt.receiptId,
      fileName: file.name,
      contractType,
      parties: meta.parties ?? [],
      governingLaw: meta.governingLaw ?? "Not specified",
      effectiveDate: meta.effectiveDate ?? "Not specified",
      clauses,
      overallRisk: summaryData.overallRisk ?? "AMBER",
      summary: summaryData.summary ?? "",
      keyRisks: summaryData.keyRisks ?? [],
      topRecommendation: summaryData.topRecommendation ?? "",
      receipt,
      analyzedAt: receipt.completedAt,
    };

    // Persist to Supabase, scoped to the authenticated user.
    try {
      await saveAnalysis(session.user.sub, analysis);
      log("analysis saved to Supabase");
    } catch (e) {
      // Don't fail the request if persistence fails — the client still gets
      // the analysis, it just won't appear in the dashboard list.
      log(`failed to save analysis: ${e instanceof Error ? e.message : e}`);
    }

    return NextResponse.json(analysis);
  } catch (err) {
    log(`pipeline FAILED — ${err instanceof Error ? err.message : err}`);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Analysis pipeline failed",
      },
      { status: 502 }
    );
  }
}
