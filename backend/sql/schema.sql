create extension if not exists "pgcrypto";

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  name text not null,
  display_date text not null,
  contract_type text not null check (contract_type in ('NDA', 'Employment', 'Vendor', 'Lease')),
  overall_risk text not null check (overall_risk in ('GREEN', 'AMBER', 'RED')),
  summary text not null,
  raw_text text not null,
  analysis_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clauses (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  clause_id text not null,
  sort_order integer not null,
  category text not null,
  text text not null,
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  risk_reason text not null,
  plain_english text not null,
  suggested_rewrite text not null,
  created_at timestamptz not null default now(),
  unique (contract_id, clause_id)
);

create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  stage_number integer not null check (stage_number between 1 and 6),
  agent_name text not null,
  description text not null,
  status text not null check (status in ('complete', 'processing', 'pending', 'failed')),
  output_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, stage_number)
);

create index if not exists contracts_user_id_created_at_idx
  on contracts(user_id, created_at desc);

create index if not exists clauses_contract_id_sort_order_idx
  on clauses(contract_id, sort_order);

create index if not exists pipeline_runs_contract_id_stage_number_idx
  on pipeline_runs(contract_id, stage_number);
