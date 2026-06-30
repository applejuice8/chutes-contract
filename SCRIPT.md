# ChutesContract — Demo Script

So this is the demo of our product

## Stage 1 — Login screen

- At the landing page, we can click sign in with chutes

**Screen:** Landing page (`/`)

**On screen, point at:**
- Logo + wordmark **"ChutesContract"**
- Heading **"Welcome back"**
- Tagline **"Trustless AI Contract Analyzer"**
- Card line **"Sign in to review and manage your contracts"**
- Button **"Sign in with Chutes"**

**Do:** Click **"Sign in with Chutes"**.

**Say:**
> "Authentication is *Sign in with Chutes* — OAuth 2.0 with PKCE. The user logs
> in with their own Chutes account, so inference is billed to them and no API
> keys ever touch the browser."

**What happens:** Redirect to the Chutes login page. Complete sign-in (use a
pre-authenticated account or your fastest login method). On return, you land on
the dashboard.

> Tip: the button briefly reads **"Checking session..."** while the session
> loads — normal.

---

## Stage 2 — Dashboard (contract list)

**Screen:** `/dashboard`

**On screen, point at:**
- Left sidebar: wordmark **"ChutesContract"**, **"New Analysis +"**, and the
  **"Your Contracts"** list (your pre-baked contract appears here).
- Main header: **"Welcome back, {username}"** then **"Contract analyses"**.
- Sub-text: *"Open a contract to inspect the six TEE agent stages, clause risks,
  plain-English translations, negotiation rewrites, and the cryptographic
  notarization receipt."*
- Top-right button **"Analyze Contract +"**.

**Say:**
> "This is the dashboard — every analysis is stored per-user in Supabase, so the
> history follows you across devices. Let's analyze a fresh contract."

> If the account is empty you'll see **"No contracts analyzed yet"** and a
> **"Analyze your first contract"** button instead — that's a fine starting
> point too.

**Do:** Click **"Analyze Contract"** (top right).

---

## Stage 3 — Upload modal + select sample contract

**Screen:** Upload modal over the dashboard

**On screen, point at:**
- Modal title **"Upload Contract"**
- Drop zone **"Click to upload or drag and drop"** / **"Supports TXT, PDF, or DOCX"**
- Buttons **"Cancel"** and **"Analyze Contract"**

**Do:**
1. Click the drop zone and choose **`sample-vendor-agreement.txt`** (the spicy
   one — it produces high-risk clauses worth showing).
2. The modal shows the selected filename and size.
3. Click **"Analyze Contract"**.

**Say:**
> "I'll use a sample vendor agreement that's deliberately one-sided. The moment
> I hit analyze, the file is SHA-256 hashed *before* anything else — that hash
> is the tamper-evidence anchor for the receipt later."

---

## Stage 4 — The 6-agent pipeline runs (the wait)

**Screen:** Upload modal, "uploading" state

**On screen, point at (labels cycle as it runs):**
- Spinner + the current stage label, which rotates through:
  1. **"Reading & hashing document..."**
  2. **"Parsing document & extracting clauses..."**
  3. **"Scoring risk & translating to plain English..."**
  4. **"Drafting negotiation redlines..."**
  5. **"Summarizing & scoring overall risk..."**
  6. **"Generating TEE attestation receipt..."**
- Footer **"Elapsed {n}s · TEE inference is slow, this can take a few minutes"**

**Say (this is your value-prop window):**
> "Behind that spinner are six independent AI agents, each its own call to a
> TEE-enabled model: a Document Parser, a Clause Extractor, a Risk Scorer, a
> Plain-English Translator, a Negotiation Advisor, and a Summary Agent. The
> independent ones run in parallel to keep it snappy. And critically — all of
> this runs inside an Intel TDX enclave with the GPU in confidential-compute
> mode, so not even Chutes can read the contract."

**Do (Option A):** While it runs, click your **pre-baked contract** in the left
sidebar to jump straight to a finished result. (When the live one finishes it
auto-navigates to its own detail page; you can revisit it at the end.)

---

## Stage 5 — Contract detail: header + verdict

**Screen:** `/dashboard/[id]`

**On screen, point at:**
- Back link **"← All contracts"**
- Two badges: the **contract type** and the **analysis date**
- **H1 = the file name**
- The summary paragraph under the title
- Button **"🔐 View Notarization Receipt"**
- Right-side card **"Summary Agent Verdict"** with the big **GREEN / AMBER / RED**
  label, **"Overall risk score"**, and clause counts (**N clauses**, **N high
  risk**, **N medium risk**)
- The three metric tiles: **"Document Type"**, **"Agents Complete" = "6 / 6"**,
  **"Clauses Flagged"**

**Say:**
> "Top-right is the Summary Agent's verdict — red, amber, or green at a glance,
> with the clause counts. Six of six agents complete. Now let's open the actual
> agent trace."

---

## Stage 6 — Agent analysis trace (the 6 stages)

**Screen:** Same detail page, scroll to **"Agent analysis trace"**
(section kicker **"TEE inference pipeline"**).

Each agent is an expandable row with a **"Complete"** badge. Expand them in
order:

1. **"Document Parser"** — *"Extracted source material and classified the
   document."* Point at the info blocks: **Detected type**, **Source file**,
   **Parsed clauses**, **Governing law**, **Effective date**, plus the detected
   **parties**.
2. **"Clause Extractor"** — *"Segmented the contract into reviewable clause
   units."* Shows each clause's text with a risk pill.
3. **"Risk Scorer"** — *"Rated each clause and explained the legal concern."*
   Expand and find a **HIGH** clause to read its one-line reason aloud.
4. **"Plain-English Translator"** — *"Converted legal wording into direct user
   impact."* Read one plain-English explanation — this is the "aha" for
   non-lawyers.
5. **"Negotiation Advisor"** — *"Suggests how to negotiate with the other
   party."* Read one concrete redline suggestion.
6. **"Summary Agent"** — *"Wraps everything into a concise summary."* Point at
   **Final verdict**, the **Key risks** list, and the **Top recommendation** box.

**Say:**
> "This isn't a single black-box prompt — each step is a distinct agent you can
> inspect. The Risk Scorer flags the danger, the Translator tells you what it
> means in plain English, and the Negotiation Advisor hands you the exact
> language to push back with."

---

## Stage 7 — The Notarization Receipt (the differentiator)

**Screen:** Detail page — click **"🔐 View Notarization Receipt"** near the top.

**On screen, point at:**
- Title **"🔐 Notarization Receipt"** / subtitle
  *"Cryptographic proof this analysis ran inside an Intel TDX enclave"*
- Buttons **"⬇ Download JSON"** and **"Verify TDX Quote ↗"**
- **"Receipt ID"**
- **LEVEL 1 — "Document Integrity"** (✅ Verified): **Contract SHA-256**,
  **Analysis SHA-256**, **Analyzed at**.
- **LEVEL 2 — "Model Identity"** (✅ Verified): **Model**, **Chute ID**,
  **Instance ID**, **Nonce**.
- **LEVEL 3 — "Intel TDX Enclave Proof"** (✅ Verified when warm): **TDX Quote
  (base64)**, **Report data binding**, **GPU Evidence**.
- The dark **"Why this matters"** box at the bottom.

**Say:**
> "Here's the part nobody else has. Level 1: the document hash proves we analyzed
> exactly the file I uploaded — nothing swapped. Level 2: the exact model
> identity. Level 3: a TDX quote signed by Intel's CPU-fused key, bound to a
> fresh nonce so it can't be replayed. Watch — I can verify it independently."

**Do:** Click **"Verify TDX Quote ↗"** → a new tab opens the public attestation
explorer showing Intel's signature chain and measurements.

> "That's a third-party verifier — you don't even have to trust *us*."

**Fallback:** If Level 3 reads **"⚠️ Unavailable"** (cold enclave), say:
> "The enclave was cold for this run, so the hardware quote isn't attached — but
> notice Levels 1 and 2 still hold: the document and analysis hashes are valid
> regardless." Then show the pre-baked contract that *does* have Level 3 green.

**Optional:** Click **"⬇ Download JSON"** to show the full receipt is portable —
"hand this to a counterparty or auditor."

---

## Stage 8 — History + delete (housekeeping)

**Screen:** Back to `/dashboard` (click **"← All contracts"**).

**On screen, point at:**
- Your analyses persist as cards (date, file name, risk badge, type / clauses /
  flags, **"View analysis"**).
- Hover a card → a **trash icon** appears top-right.

**Do:** Hover a throwaway contract, click the trash icon. Confirm the dialog
**"Delete this analysis? This permanently removes it and cannot be undone."**
The card disappears.

**Say:**
> "History is per-user and durable in Supabase, and you stay in control — delete
> anything with one click, scoped to your account."

---

## Stage 9 — Close (15 sec)

> "So: a clause-by-clause risk review, plain-English translations, and
> ready-to-send redlines — wrapped in a hardware-signed receipt that proves a
> specific model analyzed your exact document inside a sealed enclave. Fast,
> private, and independently verifiable. That's ChutesContract."

---

## Quick reference — click path

```
/  ──(Sign in with Chutes)──►  Chutes OAuth  ──►  /dashboard
/dashboard ──(Analyze Contract)──► Upload modal ──(pick sample-vendor-agreement.txt → Analyze)──► pipeline
   └─(meanwhile)─► click pre-baked contract in sidebar ──► /dashboard/[id]
/dashboard/[id] ──► expand 6 agent stages ──► View Notarization Receipt ──► Verify TDX Quote ↗
/dashboard ──► hover card ──► trash icon ──► confirm delete
```

## If something breaks

- **Stuck on spinner / timeout:** the TEE model was cold or overloaded. Switch
  to the pre-baked contract and keep talking. (Timeout is configurable via
  `CHUTES_AGENT_TIMEOUT_MS`.)
- **Level 3 "Unavailable":** cold enclave or non-TEE model — emphasize Levels 1
  & 2 still verify, then show a warm pre-baked receipt.
- **Empty dashboard after login:** you're on a different account, or
  `SUPABASE_URI` isn't set — re-run an analysis to populate it.
- **Redirect/login fails:** confirm `CHUTES_OAUTH_REDIRECT_URI` matches the
  registered app and `NEXT_PUBLIC_APP_URL` is correct.
