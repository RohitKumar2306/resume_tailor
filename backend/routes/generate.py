from fastapi import APIRouter, Depends
from services.auth import get_current_user
from models.schemas import GenerateRequest

router = APIRouter()


@router.post("/generate")
async def generate_resume(data: GenerateRequest, user=Depends(get_current_user)):
    return {"message": "generate endpoint", "user_id": user.id}
