# ChutesContract — Demo Script

So this is the demo of our product

## Stage 1 — Login screen

- At the landing page, we can click sign in with chutes
- We are using Chutes OAuth 2.0
- User login with their own Chutes account, and inference is billed to them
- No API keys ever touch the browser

---

## Stage 2 — Dashboard (contract list)

- Here, we can see all our past contracts.
- Let's click onto "new analysis", and upload sample vendor agreement
- Right now, our 6-agent pipeline will run and analyse our document
- This will take a while

---

**Say:**
> "Here's the part nobody else has. Level 1: the document hash proves we analyzed
> exactly the file I uploaded — nothing swapped. Level 2: the exact model
> identity. Level 3: a TDX quote signed by Intel's CPU-fused key, bound to a
> fresh nonce so it can't be replayed. Watch — I can verify it independently."


**Do:** Click **"Verify TDX Quote ↗"** → a new tab opens the public attestation
explorer showing Intel's signature chain and measurements.

This is Phala Network's TEE Attestation Explorer (proof.t16z.com) — a public, independent tool that takes a raw hardware attestation quote and decodes/verifies it. It's described as a secure and comprehensive analysis tool for TEE attestation reports, letting anyone verify and analyze Intel SGX and TDX attestation reports. 

> "That's a third-party verifier — you don't even have to trust *us*."

**Optional:** Click **"⬇ Download JSON"** to show the full receipt is portable —
"hand this to a counterparty or auditor."

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
