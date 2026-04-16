from fastapi import APIRouter, Depends
from services.auth import get_current_user

router = APIRouter()


@router.post("/upload")
async def upload_document(user=Depends(get_current_user)):
    return {"message": "document upload endpoint", "user_id": user.id}


@router.post("/upload-template")
async def upload_template(user=Depends(get_current_user)):
    return {"message": "template upload endpoint", "user_id": user.id}


@router.get("")
async def list_documents(user=Depends(get_current_user)):
    return {"message": "list documents endpoint", "user_id": user.id}


@router.delete("/{document_id}")
async def delete_document(document_id: str, user=Depends(get_current_user)):
    return {"message": "document deleted", "document_id": document_id}
