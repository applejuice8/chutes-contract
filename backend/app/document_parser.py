from __future__ import annotations

from io import BytesIO

from fastapi import HTTPException, UploadFile, status


SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx"}


async def extract_upload_text(file: UploadFile) -> str:
    filename = file.filename or "contract.txt"
    extension = _extension(filename)
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Upload .txt, .pdf, or .docx.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if extension == ".txt":
        return data.decode("utf-8", errors="replace").strip()
    if extension == ".pdf":
        return _extract_pdf_text(data)
    if extension == ".docx":
        return _extract_docx_text(data)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unsupported file type. Upload .txt, .pdf, or .docx.",
    )


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot >= 0 else ""


def _extract_pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF parsing dependency is missing. Install pypdf.",
        ) from exc

    reader = PdfReader(BytesIO(data))
    text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from this PDF.",
        )
    return text


def _extract_docx_text(data: bytes) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DOCX parsing dependency is missing. Install python-docx.",
        ) from exc

    document = Document(BytesIO(data))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs).strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from this DOCX.",
        )
    return text
