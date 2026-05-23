from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from app.chutes_client import ChutesClient
from app.models import (
    ClauseAnalysis,
    ContractAnalysis,
    ContractType,
    OverallRisk,
    PipelineStage,
    RiskLevel,
)


PIPELINE_STAGE_META = [
    (
        1,
        "Document Parser",
        "Extracts text, identifies contract type",
    ),
    (
        2,
        "Clause Extractor",
        "Segments into discrete clauses: payment, liability, IP, termination, non-compete",
    ),
    (
        3,
        "Risk Scorer",
        "Rates each clause Low / Medium / High and flags one-sided or vague language",
    ),
    (
        4,
        "Plain-English Translator",
        "Converts legal language into direct user impact",
    ),
    (
        5,
        "Negotiation Advisor",
        "Creates specific rewrite suggestions",
    ),
    (
        6,
        "Summary Agent",
        "One-paragraph verdict plus overall RED / AMBER / GREEN risk score",
    ),
]


class ParsedDocument(BaseModel):
    contract_type: ContractType = Field(alias="contractType")
    normalized_text: str = Field(alias="normalizedText")


class ExtractedClause(BaseModel):
    id: str
    category: str
    text: str


class ExtractedClauses(BaseModel):
    clauses: list[ExtractedClause]


class ScoredClause(BaseModel):
    id: str
    risk_level: RiskLevel = Field(alias="riskLevel")
    risk_reason: str = Field(alias="riskReason")


class RiskScores(BaseModel):
    scores: list[ScoredClause]


class TranslatedClause(BaseModel):
    id: str
    plain_english: str = Field(alias="plainEnglish")


class PlainEnglishTranslations(BaseModel):
    translations: list[TranslatedClause]


class RewriteSuggestion(BaseModel):
    id: str
    suggested_rewrite: str = Field(alias="suggestedRewrite")


class NegotiationAdvice(BaseModel):
    suggestions: list[RewriteSuggestion]


class SummaryVerdict(BaseModel):
    overall_risk: OverallRisk = Field(alias="overallRisk")
    summary: str


class PipelineResult(BaseModel):
    contract_type: ContractType
    overall_risk: OverallRisk
    summary: str
    clauses: list[ClauseAnalysis]
    stages: list[PipelineStage]


class ContractPipeline:
    def __init__(self, chutes: ChutesClient):
        self._chutes = chutes

    async def analyze(
        self,
        *,
        filename: str,
        text: str,
        user_id: str | None = None,
        contract_id: UUID | None = None,
    ) -> ContractAnalysis:
        result = await self.run(text=text)
        now = datetime.now(UTC)
        resolved_id = contract_id or uuid4()

        return ContractAnalysis(
            id=resolved_id,
            userId=user_id,
            name=filename,
            date=now.strftime("%b %-d, %Y"),
            contractType=result.contract_type,
            overallRisk=result.overall_risk,
            summary=result.summary,
            clauses=result.clauses,
            pipelineStages=result.stages,
            createdAt=now,
            updatedAt=now,
        )

    async def run(self, *, text: str) -> PipelineResult:
        stages: list[PipelineStage] = []

        parsed = await self._parse_document(text)
        stages.append(_stage(1, parsed.model_dump(by_alias=True)))

        extracted = await self._extract_clauses(parsed.normalized_text)
        stages.append(_stage(2, extracted.model_dump(by_alias=True)))

        scored = await self._score_risks(extracted)
        stages.append(_stage(3, scored.model_dump(by_alias=True)))

        translated = await self._translate_plain_english(extracted)
        stages.append(_stage(4, translated.model_dump(by_alias=True)))

        advice = await self._advise_negotiation(extracted, scored)
        stages.append(_stage(5, advice.model_dump(by_alias=True)))

        clauses = _merge_clause_outputs(extracted, scored, translated, advice)
        verdict = await self._summarize(parsed.contract_type, clauses)
        stages.append(_stage(6, verdict.model_dump(by_alias=True)))

        return PipelineResult(
            contract_type=parsed.contract_type,
            overall_risk=verdict.overall_risk,
            summary=verdict.summary,
            clauses=clauses,
            stages=stages,
        )

    async def _parse_document(self, text: str) -> ParsedDocument:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 01, Document Parser on-chain.

Extract normalized text and identify the contract type.
Allowed contractType values: NDA, Employment, Vendor, Lease.

Return JSON with:
{{
  "contractType": "NDA | Employment | Vendor | Lease",
  "normalizedText": "cleaned contract text"
}}

Contract:
{text}
""".strip(),
        )
        return ParsedDocument.model_validate(data)

    async def _extract_clauses(self, text: str) -> ExtractedClauses:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 02, Clause Extractor on-chain.

Segment the contract into discrete clauses. Prefer these categories when present:
Payment Terms, Liability, IP Rights, Termination, Non-Compete.

Return JSON with:
{{
  "clauses": [
    {{
      "id": "clause-1",
      "category": "Payment Terms",
      "text": "exact or lightly normalized clause text"
    }}
  ]
}}

Contract:
{text}
""".strip(),
        )
        return ExtractedClauses.model_validate(data)

    async def _score_risks(self, clauses: ExtractedClauses) -> RiskScores:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 03, Risk Scorer on-chain.

Rate each clause LOW, MEDIUM, or HIGH. Flag one-sided, vague, punitive,
over-broad, or unusually asymmetric language.

Return JSON with:
{{
  "scores": [
    {{
      "id": "same clause id",
      "riskLevel": "LOW | MEDIUM | HIGH",
      "riskReason": "specific reason"
    }}
  ]
}}

Clauses:
{clauses.model_dump_json()}
""".strip(),
        )
        return RiskScores.model_validate(data)

    async def _translate_plain_english(
        self, clauses: ExtractedClauses
    ) -> PlainEnglishTranslations:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 04, Plain-English Translator on-chain.

Translate each clause into plain English focused on what it means for the user.

Return JSON with:
{{
  "translations": [
    {{
      "id": "same clause id",
      "plainEnglish": "direct plain-English explanation"
    }}
  ]
}}

Clauses:
{clauses.model_dump_json()}
""".strip(),
        )
        return PlainEnglishTranslations.model_validate(data)

    async def _advise_negotiation(
        self, clauses: ExtractedClauses, scores: RiskScores
    ) -> NegotiationAdvice:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 05, Negotiation Advisor on-chain.

Suggest specific rewrite guidance for each clause. Use precise changes such as
"Change 'sole discretion' to 'mutual written agreement'".

Return JSON with:
{{
  "suggestions": [
    {{
      "id": "same clause id",
      "suggestedRewrite": "specific suggested rewrite or no-change note"
    }}
  ]
}}

Clauses:
{clauses.model_dump_json()}

Risk scores:
{scores.model_dump_json()}
""".strip(),
        )
        return NegotiationAdvice.model_validate(data)

    async def _summarize(
        self, contract_type: ContractType, clauses: list[ClauseAnalysis]
    ) -> SummaryVerdict:
        data = await self._chutes.json_chat(
            system=_json_system_prompt(),
            user=f"""
You are agent 06, Summary Agent on-chain.

Write a one-paragraph plain-English verdict and assign the overall risk score.
Use GREEN for mostly low risk, AMBER for meaningful negotiable issues, RED for
serious or signing-blocker risk.

Return JSON with:
{{
  "overallRisk": "GREEN | AMBER | RED",
  "summary": "one paragraph verdict"
}}

Contract type: {contract_type}
Clause analysis:
{[clause.model_dump() for clause in clauses]}
""".strip(),
        )
        return SummaryVerdict.model_validate(data)


def _json_system_prompt() -> str:
    return (
        "You are part of ChutesContract's six-agent on-chain legal analysis "
        "pipeline. Return only valid JSON matching the requested schema. "
        "Do not include markdown, commentary, or legal advice disclaimers."
    )


def _stage(stage_number: int, output: dict) -> PipelineStage:
    number, agent_name, description = PIPELINE_STAGE_META[stage_number - 1]
    return PipelineStage(
        stageNumber=number,
        agentName=agent_name,
        description=description,
        output=output,
    )


def _merge_clause_outputs(
    extracted: ExtractedClauses,
    scored: RiskScores,
    translated: PlainEnglishTranslations,
    advice: NegotiationAdvice,
) -> list[ClauseAnalysis]:
    scores_by_id = {score.id: score for score in scored.scores}
    translations_by_id = {
        translation.id: translation for translation in translated.translations
    }
    suggestions_by_id = {suggestion.id: suggestion for suggestion in advice.suggestions}

    clauses: list[ClauseAnalysis] = []
    for clause in extracted.clauses:
        score = scores_by_id.get(clause.id)
        translation = translations_by_id.get(clause.id)
        suggestion = suggestions_by_id.get(clause.id)

        clauses.append(
            ClauseAnalysis(
                id=clause.id,
                category=clause.category,
                text=clause.text,
                riskLevel=score.risk_level if score else RiskLevel.MEDIUM,
                riskReason=score.risk_reason if score else "Risk score unavailable.",
                plainEnglish=translation.plain_english
                if translation
                else "Plain-English translation unavailable.",
                suggestedRewrite=suggestion.suggested_rewrite
                if suggestion
                else "Negotiation suggestion unavailable.",
            )
        )

    return clauses
