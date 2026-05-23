from __future__ import annotations

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.chutes_client import ChutesClient
from app.config import Settings, get_settings
from app.database import Database
from app.document_parser import extract_upload_text
from app.models import AnalyzeResponse, ContractAnalysis, ContractListItem
from app.pipeline import ContractPipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    database = Database(settings)
    await database.connect()
    app.state.database = database
    app.state.settings = settings
    yield
    await database.close()


app = FastAPI(title="Chutes Contract API", version="0.1.0", lifespan=lifespan)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_database() -> Database:
    return app.state.database


def get_pipeline(settings: Settings = Depends(get_settings)) -> ContractPipeline:
    return ContractPipeline(ChutesClient(settings))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/contracts", response_model=list[ContractListItem])
async def list_contracts(
    user_id: str | None = None,
    x_user_id: str | None = Header(default=None),
    database: Database = Depends(get_database),
) -> list[ContractListItem]:
    return await database.list_contracts(user_id=user_id or x_user_id)


@app.get("/api/v1/contracts/{contract_id}", response_model=ContractAnalysis)
async def get_contract(
    contract_id: UUID,
    database: Database = Depends(get_database),
) -> ContractAnalysis:
    contract = await database.get_contract(contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found.",
        )
    return contract


@app.post("/api/v1/contracts/analyze", response_model=AnalyzeResponse)
async def analyze_contract(
    file: UploadFile = File(...),
    user_id: str | None = None,
    x_user_id: str | None = Header(default=None),
    database: Database = Depends(get_database),
    pipeline: ContractPipeline = Depends(get_pipeline),
) -> AnalyzeResponse:
    raw_text = await extract_upload_text(file)
    contract = await pipeline.analyze(
        filename=file.filename or "contract.txt",
        text=raw_text,
        user_id=user_id or x_user_id,
    )
    await database.save_contract(contract, raw_text=raw_text)
    return AnalyzeResponse(contract=contract)


@app.post("/api/v1/contracts/{contract_id}/rerun", response_model=AnalyzeResponse)
async def rerun_contract(
    contract_id: UUID,
    database: Database = Depends(get_database),
    pipeline: ContractPipeline = Depends(get_pipeline),
) -> AnalyzeResponse:
    existing = await database.get_contract(contract_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract not found.",
        )

    raw_text = await database.get_raw_text(contract_id)
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contract source text not found.",
        )
    contract = await pipeline.analyze(
        filename=existing.name,
        text=raw_text,
        user_id=existing.userId,
        contract_id=contract_id,
    )
    contract.createdAt = existing.createdAt
    await database.save_contract(contract, raw_text=raw_text)
    return AnalyzeResponse(contract=contract)
