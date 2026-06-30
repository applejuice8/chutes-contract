# ChutesContract — Trustless AI Contract Analysis with Cryptographic Notarization

> Upload a contract. Get a clause-by-clause risk breakdown, plain-English translations, and negotiation-ready redlines in minutes — each analysis backed by a hardware-signed **proof** that a specific AI model ran inside a sealed Intel TDX enclave and never leaked your document.

ChutesContract turns a slow, expensive, trust-me-bro process (legal review) into a fast, private, and _independently verifiable_ one. It runs every analysis on [Chutes](https://chutes.ai) TEE inference, so the result comes with an Intel TDX attestation quote and NVIDIA confidential-compute evidence. That receipt is something **OpenAI, Anthropic, and Google literally cannot produce.**

---

## The problem

Reviewing a contract well is expensive, slow, and gated behind expertise most people don't have.

- **Students and new grads** sign employment offers, IP assignment clauses, and lease agreements they don't fully understand. A bad non-compete or invention-assignment clause can follow them for years.
- **Founders and small businesses** sign vendor SLAs, NDAs, and SaaS terms without a lawyer on retainer. One-sided liability caps and data-rights clauses routinely slip through.
- **Individuals** face rental agreements, freelance contracts, and terms of service with no practical way to assess risk.

Generic "AI contract review" tools already exist, but they share a fatal flaw for legal and confidential material: **you have to trust the provider.** When you paste a contract into a normal AI API, the prompt and output pass through the provider's host OS, hypervisor, logging, and staff. For an NDA, an unsigned M&A draft, or an employment agreement, "trust our privacy policy" is not good enough — and it's certainly not _provable_ to a counterparty, a court, or a compliance team.

## The solution

ChutesContract pairs a six-stage contract-analysis pipeline with **proof-of-inference notarization**:

1. **Private by hardware, not by policy.** Inference runs inside an Intel TDX Trust Domain with the GPU in NVIDIA Confidential Compute mode. The host operator — including Chutes — cannot read your contract.
2. **Tamper-evident.** The document is SHA-256 hashed _before_ analysis. Anyone holding the original file can prove the analyzed document is exactly what was uploaded.
3. **Independently verifiable.** Each analysis produces a downloadable **Notarization Receipt** containing the Intel TDX quote, GPU attestation, model identity, and a freshness nonce. One click verifies it against a public attestation explorer that runs Intel's DCAP verification — no need to trust ChutesContract either.

The result: a contract review you can _hand to a counterparty or auditor_ and say "here's cryptographic proof of exactly which model analyzed this, in a sealed enclave, on this exact document."

---

## Who it's for and why it matters

| User                                                     | Pain point                                                 | What ChutesContract delivers                                    |
| -------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| **Students / job seekers**                               | Don't understand offer letters, IP clauses, non-competes   | Plain-English explanation + "what to push back on" per clause   |
| **Founders / SMBs**                                      | No in-house counsel for vendor/SaaS/NDA review             | Risk verdict (GREEN/AMBER/RED) + redline suggestions in minutes |
| **Privacy-sensitive teams (legal, healthcare, finance)** | Can't paste confidential drafts into hosted AI             | Hardware-isolated inference + a receipt that proves it          |
| **Anyone with a lease or freelance contract**            | Legalese is opaque and one-sided terms hide in plain sight | Clause-by-clause flags and concrete negotiation language        |

---

## How Chutes is the core of the product

Chutes isn't a swappable backend here — the product's entire value proposition depends on Chutes-specific capabilities:

- **TEE inference on `llm.chutes.ai`.** All six analysis stages run on a TEE-enabled model (`deepseek-ai/DeepSeek-V3.2-TEE`). The Chutes completion response itself carries integrity fields (`chutes_verification`, `template_sha256`, `prompt_sha256`).
- **On-chain / hardware attestation via `api.chutes.ai/chutes/{id}/evidence`.** We request a TDX quote and NVIDIA GPU evidence **bound to a per-request 32-byte nonce**, fetched _in parallel_ with the analysis pipeline. This is what makes the notarization receipt real rather than decorative.
- **Sign in with Chutes (OAuth 2.0 + PKCE).** Users authenticate with their own Chutes account, so inference is billed to them and no API keys live in the browser. The OAuth `chutes:invoke` scope authorizes inference; the app falls back to a server key only if a token lacks invoke permission.
- **Agentic, multi-stage workflow.** The pipeline orchestrates distinct analytical roles (parse → extract → score → translate → advise → summarize) rather than a single prompt, and chains structured JSON between stages.

Remove Chutes and the product collapses to "another AI contract tool you have to trust." The TEE quote, GPU evidence, and nonce-bound attestation are unique to Chutes infrastructure.

---

## What it does (end-to-end)

```
User uploads contract
        │
        ▼  POST /api/contracts/analyze   (auth-gated by Chutes session)
        │
        ├─ SHA-256(file) ───────────────► contractHash        (tamper-evidence)
        ├─ generateNonce() ─────────────► 64 hex chars         (freshness)
        │
        ├─ fetchTEEEvidence(nonce) ──────────────────────────────┐  (parallel)
        │                                                        │
        │  6-agent pipeline (each agent = its own Chutes call):  │
        ├─ Phase 1 ‖ Document Parser  +  Clause Extractor ───────┤
        ├─ Phase 2 ‖ Risk Scorer      +  Plain-English Translator┤
        ├─ Phase 3 │ Negotiation Advisor (needs risk scores) ────┤
        ├─ Phase 4 │ Summary Agent (verdict + key risks) ────────┤
        │            │                                           │
        │            └────────────────── await ──────────────────┘
        │                          │
        │                    buildReceipt()
        │                          │
        ▼                { clauses, summary, receipt }
   Supabase (Postgres)  ──►  GET/DELETE /api/contracts[/:id]  ──►  /dashboard/[id]  ──►  ReceiptPanel (3 verification tiers)
```

Analyses are persisted server-side in Supabase Postgres, scoped to the authenticated Chutes user (`sub`). The dashboard sidebar, the contract list, and the detail page all read from the `/api/contracts` endpoints rather than browser storage, so history is durable and available across devices. Each contract card has a delete button that removes the analysis via `DELETE /api/contracts/:id` (also user-scoped).

**The six analysis stages** (shown in the UI as a pipeline trace):

1. **Document Parser** — detects contract type and parties.
2. **Clause Extractor** — segments the contract into discrete clauses.
3. **Risk Scorer** — rates each clause LOW / MEDIUM / HIGH with a reason.
4. **Plain-English Translator** — explains each clause for a non-lawyer.
5. **Negotiation Advisor** — suggests specific redline language and priority.
6. **Summary Agent** — produces an overall GREEN / AMBER / RED verdict, top risks, and the single most important change to negotiate.

**The Notarization Receipt** presents three verification tiers:

- **Level 1 — Document Integrity:** SHA-256 of the uploaded file and of the analysis. Always available.
- **Level 2 — Model Identity:** exact model, chute ID, enclave instance ID, and nonce. Always available.
- **Level 3 — Intel TDX Enclave Proof:** the base64 TDX quote, NVIDIA GPU evidence, and nonce binding. A one-click **"Verify TDX Quote"** button uploads the quote to a public attestation explorer and opens a report showing the Intel signature chain and measurements.

---

## Performance & engineering notes

The analysis is a genuine **6-agent pipeline** — each stage is its own Chutes call with a focused system prompt, rather than one mega-prompt. To keep the slower TEE model (~10 tokens/sec) responsive, independent agents run **concurrently**: the Document Parser and Clause Extractor run in parallel (both read raw text), then the Risk Scorer and Plain-English Translator run in parallel over the extracted clauses. The Negotiation Advisor runs next (it needs risk scores), and the Summary Agent runs last.

Two techniques keep the multi-agent design fast and reliable:

- **Compact id-keyed merging.** The Clause Extractor produces the canonical clause list with stable ids. Downstream agents return only small `{ id, field }` arrays that are merged back by id, so clause text is generated once instead of being re-emitted by every stage. This avoids the latency blow-up of a naive chain and prevents clause text from drifting between agents.
- **Per-agent fault isolation.** Every agent response is parsed through a `safeParse` helper with a fallback, so a single malformed JSON response degrades only that field instead of failing the whole analysis.

Other reliability work:

- **Per-call timeouts** (`AbortController`, configurable via `CHUTES_AGENT_TIMEOUT_MS`) so a cold enclave can't hang the request forever.
- **Timestamped server-side stage logging** (`Stage N/6 ...`) for full visibility into pipeline progress.
- **Graceful degradation:** if TEE evidence is unavailable (cold enclave), Levels 1 and 2 of the receipt still hold; only Level 3 shows "unavailable."
- **Robust JSON parsing** with markdown-fence stripping, since LLMs occasionally wrap JSON in code blocks.

---

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript 5)
- **Tailwind CSS v4**
- **Supabase (Postgres)** via `pg` — durable, per-user analysis history
- **Chutes** — TEE inference (`llm.chutes.ai`), attestation evidence (`api.chutes.ai`), and OAuth IDP
- **Web Crypto API** for SHA-256 hashing and nonce generation
- Public **TEE Attestation Explorer** (Phala / t16z) for one-click quote verification

---

## Getting started

### Prerequisites

- Node.js 20+
- A Chutes account and a registered OAuth app (see below)

### Install

```bash
cd chutes-contract
npm install
```

### Configure environment

Copy the example and fill in your values:

```bash
cp env.local.example .env.local
```

| Variable                     | Description                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CHUTES_API_KEY`             | Chutes API key (`cpk_...`). Used to register the OAuth app and as a server-side inference fallback.    |
| `CHUTES_OAUTH_CLIENT_ID`     | OAuth app client id (`cid_...`).                                                                       |
| `CHUTES_OAUTH_CLIENT_SECRET` | OAuth app client secret (`csc_...`) — server-side only.                                                |
| `NEXT_PUBLIC_APP_URL`        | Base URL of the app, e.g. `http://localhost:3000`.                                                     |
| `CHUTES_OAUTH_REDIRECT_URI`  | Full callback URL, must match a registered redirect URI.                                               |
| `CHUTES_MODEL`               | TEE model for all stages. Default: `deepseek-ai/DeepSeek-V3.2-TEE`.                                    |
| `CHUTES_CHUTE_ID`            | Chute UUID for the attestation `evidence` endpoint (the model name with slashes won't work as a path). |
| `CHUTES_AGENT_TIMEOUT_MS`    | Optional per-call timeout (default 240000).                                                            |
| `SUPABASE_URI`               | Supabase Postgres connection string (transaction pooler). Used to persist analyses per user.           |

> Find a model's chute UUID by listing chutes from `https://api.chutes.ai/chutes/` and matching the model name. TEE-enabled models end in `-TEE`.

### Register an OAuth app

```bash
curl -X POST "https://api.chutes.ai/idp/apps" \
  -H "Authorization: Bearer $CHUTES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ChutesContract",
    "description": "Trustless AI contract analyzer",
    "redirect_uris": ["http://localhost:3000/api/auth/chutes/callback"],
    "homepage_url": "http://localhost:3000",
    "allowed_scopes": ["openid", "profile", "chutes:invoke"]
  }'
```

### Run

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

### Try it

Two sample contracts are included under `chutes-contract/test-contracts/`:

- `sample-vendor-agreement.txt` — seeded with a spread of risk levels (expect AMBER/RED).
- `sample-nda-low-risk.txt` — a clean mutual NDA (expect GREEN).

1. Sign in with Chutes.
2. Upload a contract and watch the stage labels + elapsed timer (TEE inference takes a few minutes).
3. Review the clause-by-clause breakdown and overall verdict.
4. Click **View Notarization Receipt** → confirm Levels 1 and 2 are green; Level 3 is green when the TEE enclave is warm.
5. Click **Verify TDX Quote** to open the independent attestation report, or **Download JSON** for the full receipt.
6. Back on the dashboard, hover a contract card and click the trash icon to delete an analysis you no longer need.

---

## Project structure

```
chutes-contract/
  app/
    api/auth/chutes/{login,callback,session,logout}/   # OAuth 2.0 + PKCE
    api/contracts/analyze/route.ts                     # 6-agent pipeline + receipt + persist
    api/contracts/route.ts                             # GET list (user-scoped)
    api/contracts/[id]/route.ts                        # GET + DELETE single analysis (user-scoped)
    api/contracts/receipt/[id]/route.ts                # receipt store (in-memory)
    api/contracts/verify-quote/route.ts                # proxy to attestation explorer
    dashboard/{page,layout}.tsx, dashboard/[id]/page.tsx
  components/ReceiptPanel.tsx                           # 3-tier verification UI
  lib/
    chutesAuth.ts        # OAuth config, PKCE helpers
    serverAuth.ts        # session cookie + access-token helpers
    teeAttestation.ts    # nonce, hashing, evidence fetch, receipt builder
    db.ts                # Supabase/Postgres pool + analysis persistence
    contractData.ts      # types + mock fallback data
  middleware.ts          # guards /dashboard and /upload
  test-contracts/        # sample contracts for demo
```

---

## Current limitations & roadmap

Honest about what's MVP-stage:

- **Text extraction.** The pipeline reads uploaded files as UTF-8 text, so `.txt` works best today. Robust `.pdf`/`.docx` parsing (PDF text layers, DOCX XML) is the next step.
- **Persistence.** Analyses are persisted in **Supabase Postgres**, scoped per Chutes user, so history survives across sessions and devices. The `contracts` table is created automatically on first write. Receipts are also embedded in each stored analysis; the standalone in-memory receipt map remains only as a legacy stub.
- **Latency.** Capped by TEE model throughput (~10 tok/s). Future work: streaming responses for perceived speed, a smaller TEE model for lighter stages, and caching.
- **Verification.** Level 3 currently verifies via a public explorer running Intel DCAP. A fully self-hosted DCAP Quote Verification Library is a future hardening step. GPU (NVIDIA NRAS) verification is captured in the receipt and can be wired into the one-click flow next.
- **AI output is assistance, not legal advice.** ChutesContract surfaces risks and drafting suggestions; it does not replace a qualified attorney.

---

## License

See [LICENSE](./LICENSE).
