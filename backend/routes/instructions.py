from fastapi import APIRouter, Depends
from services.auth import get_current_user
from models.schemas import InstructionUpdate

router = APIRouter()


@router.get("")
async def get_instructions(user=Depends(get_current_user)):
    return {"message": "instructions endpoint", "user_id": user.id}


@router.put("")
async def update_instructions(data: InstructionUpdate, user=Depends(get_current_user)):
    return {"message": "instructions updated", "user_id": user.id}
