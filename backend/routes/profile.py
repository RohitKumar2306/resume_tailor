from fastapi import APIRouter, Depends, HTTPException
from services.auth import get_current_user
from services.crypto import encrypt_api_key
from db.supabase import get_supabase_client
from models.schemas import ProfileUpdate

router = APIRouter()


@router.get("")
async def get_profile(user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("profiles")
        .select("full_name, location, preferred_llm, api_key_encrypted")
        .eq("id", user.id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    row = result.data
    return {
        "full_name": row.get("full_name"),
        "location": row.get("location"),
        "preferred_llm": row.get("preferred_llm"),
        "has_api_key": bool(row.get("api_key_encrypted")),
    }


@router.put("")
async def update_profile(data: ProfileUpdate, user=Depends(get_current_user)):
    client = get_supabase_client()
    updates = {}

    if data.full_name is not None:
        updates["full_name"] = data.full_name
    if data.location is not None:
        updates["location"] = data.location
    if data.preferred_llm is not None:
        updates["preferred_llm"] = data.preferred_llm
    if data.api_key is not None and data.api_key.strip():
        updates["api_key_encrypted"] = encrypt_api_key(data.api_key.strip())

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    client.table("profiles").update(updates).eq("id", user.id).execute()

    result = (
        client.table("profiles")
        .select("full_name, location, preferred_llm")
        .eq("id", user.id)
        .single()
        .execute()
    )

    return result.data
