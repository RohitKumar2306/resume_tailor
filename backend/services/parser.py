from io import BytesIO
from pathlib import Path

import fitz
from docx import Document
from fastapi import HTTPException

MAGIC_BYTES = {".pdf": b"%PDF", ".docx": b"PK\x03\x04"}
MAX_SIZE = 10 * 1024 * 1024


def validate_upload(
    file_bytes: bytes, filename: str, allowed_extensions: list
) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only {allowed_extensions} files accepted",
        )
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File size must be under 10MB")
    expected = MAGIC_BYTES.get(ext)
    if expected and not file_bytes[: len(expected)].startswith(expected):
        raise HTTPException(
            status_code=400,
            detail="File content does not match its extension",
        )
    return ext


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    doc = Document(BytesIO(file_bytes))
    paragraphs = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if text:
            paragraphs.append(text)
    return "\n".join(paragraphs)


def extract_text(file_bytes: bytes, extension: str) -> str:
    if extension == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif extension == ".docx":
        return extract_text_from_docx(file_bytes)
    raise HTTPException(status_code=400, detail=f"Unsupported file type: {extension}")


def chunk_text(text: str) -> list:
    chunks = []
    for line in text.split("\n"):
        stripped = line.strip()
        if len(stripped) >= 20:
            chunks.append(stripped)
    return chunks
