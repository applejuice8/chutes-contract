import { NextRequest, NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/serverAuth";
import {
  generateNonce,
  sha256HexBuffer,
  fetchTEEEvidence,
  buildReceipt,
  TEEEvidence,
} from "@/lib/teeAttestation";

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

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = makeLogger(requestId);
  log("request received");

  // 1. Auth gate
  const accessToken = await getServerAccessToken();
  if (!accessToken) {
    log("rejected: not authenticated");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

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

  try {
    // 5. Analyst — single pass that parses, extracts, scores, translates, and
    //    advises. Combining these avoids re-emitting the full clause array once
    //    per field (the old 6-call pipeline regenerated all clause text ~3x).
    const analystRaw = await callChutesAgent(
      accessToken,
      "Stage 1-5/6 Analyst (parse+extract+score+translate+advise)",
      `You are an expert contract analyst. Analyze the contract and return a SINGLE JSON object.
First identify the contract type (NDA, Employment, Vendor, Lease, or Other) and the parties.
Then segment the contract into discrete clauses. For EACH clause, provide all fields below in one pass.
Respond ONLY with valid JSON, no markdown fences, no preamble:
{
  "contractType": string,
  "parties": [{ "name": string, "role": string }],
  "clauses": [{
    "id": string,
    "category": string,
    "title": string,
    "text": string (the clause text, kept concise),
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "riskReason": string (one sentence),
    "plainEnglish": string (what it means for a non-lawyer),
    "suggestedRewrite": string (redline language to negotiate a better deal, or "No changes needed."),
    "negotiationPriority": "MUST_CHANGE" | "SHOULD_CHANGE" | "OPTIONAL" | "ACCEPT"
  }]
}`,
      contractText,
      8192,
      log
    );

    // 6. Summary — small, bounded call over the analyzed clauses.
    const summaryRaw = await callChutesAgent(
      accessToken,
      "Stage 6/6 Summary Agent",
      `You are a contract summary agent. Given an analyzed contract JSON object, produce a high-level summary.
Respond ONLY with valid JSON, no markdown fences:
{
  "overallRisk": "GREEN" | "AMBER" | "RED",
  "summary": string (2-3 sentences),
  "keyRisks": [string] (top 3 risks),
  "topRecommendation": string (the single most important change to negotiate)
}
Base the verdict on: GREEN = mostly LOW risk, AMBER = several MEDIUM risks, RED = any HIGH risks present.`,
      analystRaw,
      600,
      log
    );

    // 7. Await TEE evidence (was fetching in parallel)
    log("all stages complete; awaiting TEE evidence");
    const evidence = await evidencePromise;

    // 8. Parse outputs safely
    let clauses: unknown[] = [];
    let summaryData: Record<string, unknown> = {};
    let parsedMeta: Record<string, unknown> = {};

    try {
      const analyst = JSON.parse(stripFences(analystRaw)) as {
        contractType?: unknown;
        parties?: unknown;
        clauses?: unknown[];
      };
      parsedMeta = {
        contractType: analyst.contractType ?? "Unknown",
        parties: analyst.parties ?? [],
      };
      clauses = Array.isArray(analyst.clauses) ? analyst.clauses : [];
    } catch (e) {
      log(`failed to parse analyst output: ${e instanceof Error ? e.message : e}`);
      parsedMeta = { contractType: "Unknown", parties: [] };
      clauses = [];
    }

    try {
      summaryData = JSON.parse(stripFences(summaryRaw));
    } catch (e) {
      log(`failed to parse summary: ${e instanceof Error ? e.message : e}`);
      summaryData = {
        overallRisk: "AMBER",
        summary: "Analysis complete.",
        keyRisks: [],
        topRecommendation: "",
      };
    }

    // 9. Build notarization receipt
    const receipt = await buildReceipt({
      contractHash,
      analysisText: analystRaw + summaryRaw,
      modelId: MODEL,
      chuteId: CHUTE_ID,
      nonce,
      evidence,
      requestedAt,
    });

    log(
      `complete — ${(clauses as unknown[]).length} clauses, risk=${summaryData.overallRisk ?? "AMBER"}, TEE=${
        receipt.tdxQuote !== "unavailable" ? "verified" : "unavailable"
      }`
    );

    return NextResponse.json({
      id: receipt.receiptId,
      fileName: file.name,
      contractType: parsedMeta.contractType ?? "Unknown",
      parties: parsedMeta.parties ?? [],
      clauses,
      overallRisk: summaryData.overallRisk ?? "AMBER",
      summary: summaryData.summary ?? "",
      keyRisks: summaryData.keyRisks ?? [],
      topRecommendation: summaryData.topRecommendation ?? "",
      receipt,
      analyzedAt: receipt.completedAt,
    });
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
