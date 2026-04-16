from fastapi import APIRouter, Depends
from services.auth import get_current_user

router = APIRouter()


@router.get("")
async def list_generations(user=Depends(get_current_user)):
    return {"message": "generations list endpoint", "user_id": user.id}


@router.get("/{generation_id}")
async def get_generation(generation_id: str, user=Depends(get_current_user)):
    return {"message": "generation detail endpoint", "generation_id": generation_id}


@router.get("/{generation_id}/download")
async def download_generation(generation_id: str, user=Depends(get_current_user)):
    return {"message": "download endpoint", "generation_id": generation_id}
