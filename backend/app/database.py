from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.config import Settings
from app.models import ContractAnalysis, ContractListItem


class Database:
    def __init__(self, settings: Settings):
        if not settings.supabase_db_uri:
            raise RuntimeError("SUPABASE_DB_URI is required")
        self._db_uri = settings.supabase_db_uri
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(dsn=self._db_uri, min_size=1, max_size=5)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def list_contracts(self, *, user_id: str | None = None) -> list[ContractListItem]:
        rows = await self._fetch(
            """
            select
              c.id,
              c.user_id,
              c.name,
              c.display_date,
              c.contract_type,
              c.overall_risk,
              c.summary,
              c.created_at,
              count(cl.id)::int as clause_count,
              count(cl.id) filter (where cl.risk_level = 'HIGH')::int as high_risk_count
            from contracts c
            left join clauses cl on cl.contract_id = c.id
            where ($1::text is null or c.user_id = $1)
            group by c.id
            order by c.created_at desc
            """,
            user_id,
        )
        return [
            ContractListItem(
                id=row["id"],
                name=row["name"],
                date=row["display_date"],
                contractType=row["contract_type"],
                overallRisk=row["overall_risk"],
                summary=row["summary"],
                clauseCount=row["clause_count"],
                highRiskCount=row["high_risk_count"],
                createdAt=row["created_at"],
            )
            for row in rows
        ]

    async def get_contract(self, contract_id: UUID) -> ContractAnalysis | None:
        rows = await self._fetch(
            """
            select analysis_json
            from contracts
            where id = $1
            """,
            contract_id,
        )
        if not rows:
            return None
        analysis = rows[0]["analysis_json"]
        if isinstance(analysis, str):
            analysis = json.loads(analysis)
        return ContractAnalysis.model_validate(analysis)

    async def get_raw_text(self, contract_id: UUID) -> str | None:
        rows = await self._fetch(
            """
            select raw_text
            from contracts
            where id = $1
            """,
            contract_id,
        )
        if not rows:
            return None
        return rows[0]["raw_text"]

    async def save_contract(self, contract: ContractAnalysis, *, raw_text: str) -> None:
        payload = json.dumps(contract.model_dump(mode="json", by_alias=True))
        async with self._connection() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    insert into contracts (
                      id,
                      user_id,
                      name,
                      display_date,
                      contract_type,
                      overall_risk,
                      summary,
                      raw_text,
                      analysis_json,
                      created_at,
                      updated_at
                    )
                    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                    on conflict (id) do update set
                      user_id = excluded.user_id,
                      name = excluded.name,
                      display_date = excluded.display_date,
                      contract_type = excluded.contract_type,
                      overall_risk = excluded.overall_risk,
                      summary = excluded.summary,
                      raw_text = excluded.raw_text,
                      analysis_json = excluded.analysis_json,
                      updated_at = excluded.updated_at
                    """,
                    contract.id,
                    contract.userId,
                    contract.name,
                    contract.date,
                    str(contract.contractType),
                    str(contract.overallRisk),
                    contract.summary,
                    raw_text,
                    payload,
                    contract.createdAt,
                    contract.updatedAt,
                )
                await conn.execute("delete from clauses where contract_id = $1", contract.id)
                for index, clause in enumerate(contract.clauses):
                    await conn.execute(
                        """
                        insert into clauses (
                          contract_id,
                          clause_id,
                          sort_order,
                          category,
                          text,
                          risk_level,
                          risk_reason,
                          plain_english,
                          suggested_rewrite
                        )
                        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                        """,
                        contract.id,
                        clause.id,
                        index,
                        clause.category,
                        clause.text,
                        str(clause.riskLevel),
                        clause.riskReason,
                        clause.plainEnglish,
                        clause.suggestedRewrite,
                    )

                await conn.execute(
                    "delete from pipeline_runs where contract_id = $1",
                    contract.id,
                )
                for stage in contract.pipelineStages:
                    await conn.execute(
                        """
                        insert into pipeline_runs (
                          contract_id,
                          stage_number,
                          agent_name,
                          description,
                          status,
                          output_json,
                          completed_at
                        )
                        values ($1,$2,$3,$4,$5,$6,$7)
                        """,
                        contract.id,
                        stage.stageNumber,
                        stage.agentName,
                        stage.description,
                        str(stage.status),
                        json.dumps(stage.output),
                        datetime.now(UTC),
                    )

    async def _fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        async with self._connection() as conn:
            return await conn.fetch(query, *args)

    def _connection(self):
        if not self._pool:
            raise RuntimeError("Database pool is not connected")
        return self._pool.acquire()
