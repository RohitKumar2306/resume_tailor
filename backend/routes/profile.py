from fastapi import APIRouter, Depends
from services.auth import get_current_user
from models.schemas import ProfileUpdate

router = APIRouter()


@router.get("")
async def get_profile(user=Depends(get_current_user)):
    return {"message": "profile endpoint", "user_id": user.id}


@router.put("")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    return {"message": "profile updated", "user_id": user.id}
