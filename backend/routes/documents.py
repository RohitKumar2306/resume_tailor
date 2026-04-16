import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from services.auth import get_current_user
from services.parser import validate_upload, extract_text, chunk_text
from services.embedder import embed_chunks
from services.template import extract_styles_from_template
from db.supabase import get_supabase_client
from models.schemas import DocumentResponse

router = APIRouter()


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    user=Depends(get_current_user),
):
    if file_type not in ("base_resume", "style_doc"):
        raise HTTPException(
            status_code=400,
            detail="file_type must be 'base_resume' or 'style_doc'",
        )

    file_bytes = await file.read()
    ext = validate_upload(file_bytes, file.filename or "file", [".pdf", ".docx"])

    client = get_supabase_client()
    file_id = str(uuid.uuid4())
    storage_path = f"{user.id}/{file_type}/{file_id}_{file.filename}"

    client.storage.from_("documents").upload(
        storage_path, file_bytes, {"content-type": file.content_type or "application/octet-stream"}
    )

    parsed_text = extract_text(file_bytes, ext)

    result = (
        client.table("documents")
        .insert(
            {
                "user_id": user.id,
                "file_name": file.filename,
                "file_type": file_type,
                "storage_path": storage_path,
                "parsed_text": parsed_text,
                "styles_snapshot": None,
            }
        )
        .execute()
    )

    doc_row = result.data[0]

    chunks = chunk_text(parsed_text)
    if chunks:
        embeddings = embed_chunks(chunks)
        chunk_rows = [
            {
                "user_id": user.id,
                "document_id": doc_row["id"],
                "chunk_text": chunks[i],
                "embedding": str(embeddings[i]),
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        client.table("document_chunks").insert(chunk_rows).execute()

    return DocumentResponse(
        id=doc_row["id"],
        file_name=doc_row["file_name"],
        file_type=doc_row["file_type"],
        uploaded_at=doc_row["uploaded_at"],
        has_template=False,
    )


@router.post("/upload-template", response_model=DocumentResponse)
async def upload_template(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    filename = file.filename or "template.docx"

    if filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Format template must be a DOCX file",
        )

    file_bytes = await file.read()
    validate_upload(file_bytes, filename, [".docx"])

    client = get_supabase_client()

    existing = (
        client.table("documents")
        .select("id, storage_path")
        .eq("user_id", user.id)
        .eq("file_type", "format_template")
        .execute()
    )

    if existing.data:
        old = existing.data[0]
        try:
            client.storage.from_("documents").remove([old["storage_path"]])
        except Exception:
            pass
        client.table("documents").delete().eq("id", old["id"]).execute()

    file_id = str(uuid.uuid4())
    storage_path = f"{user.id}/format_template/{file_id}_{filename}"

    client.storage.from_("documents").upload(
        storage_path, file_bytes, {"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    )

    styles_snapshot = extract_styles_from_template(file_bytes)

    result = (
        client.table("documents")
        .insert(
            {
                "user_id": user.id,
                "file_name": filename,
                "file_type": "format_template",
                "storage_path": storage_path,
                "parsed_text": None,
                "styles_snapshot": styles_snapshot,
            }
        )
        .execute()
    )

    doc_row = result.data[0]

    return DocumentResponse(
        id=doc_row["id"],
        file_name=doc_row["file_name"],
        file_type=doc_row["file_type"],
        uploaded_at=doc_row["uploaded_at"],
        has_template=True,
    )


@router.get("")
async def list_documents(user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("documents")
        .select("id, file_name, file_type, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", desc=True)
        .execute()
    )

    base_resumes = []
    style_docs = []
    format_template = None

    for doc in result.data or []:
        item = {
            "id": doc["id"],
            "file_name": doc["file_name"],
            "file_type": doc["file_type"],
            "uploaded_at": doc["uploaded_at"],
        }
        if doc["file_type"] == "base_resume":
            base_resumes.append(item)
        elif doc["file_type"] == "style_doc":
            style_docs.append(item)
        elif doc["file_type"] == "format_template":
            format_template = item

    return {
        "base_resumes": base_resumes,
        "style_docs": style_docs,
        "format_template": format_template,
    }


@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    client = get_supabase_client()

    result = (
        client.table("documents")
        .select("id, user_id, storage_path")
        .eq("id", document_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = result.data
    if doc["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        client.storage.from_("documents").remove([doc["storage_path"]])
    except Exception:
        pass

    client.table("documents").delete().eq("id", document_id).execute()

    return {"deleted": True}
