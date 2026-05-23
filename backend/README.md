# Chutes Contract Backend

FastAPI backend for the ChutesContract six-agent pipeline.

## What it does

- Accepts `.txt`, `.pdf`, and `.docx` contracts.
- Runs the six Chutes agents in order:
  1. Document Parser
  2. Clause Extractor
  3. Risk Scorer
  4. Plain-English Translator
  5. Negotiation Advisor
  6. Summary Agent
- Stores contracts, clauses, stage outputs, and raw source text in Supabase Postgres.
- Returns data in the same shape the Next dashboard details page expects.

## Environment

Create `backend/.env`:

```bash
SUPABASE_DB_URI=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
CHUTES_API_KEY=cpk_your_chutes_api_key
CHUTES_BASE_URL=https://llm.chutes.ai/v1
CHUTES_MODEL=your-chutes-model-id
```

## Supabase setup

Run `backend/sql/schema.sql` in the Supabase SQL editor.

## Local commands

From the repo root:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API

```bash
GET  /health
GET  /api/v1/contracts
GET  /api/v1/contracts/{contract_id}
POST /api/v1/contracts/analyze
POST /api/v1/contracts/{contract_id}/rerun
```

Analyze a contract:

```bash
curl -X POST http://localhost:8000/api/v1/contracts/analyze \
  -H "X-User-Id: demo-user" \
  -F "file=@/path/to/contract.pdf"
```
