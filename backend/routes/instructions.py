from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from db.supabase import get_supabase_client
from services.auth import get_current_user
from models.schemas import InstructionUpdate

router = APIRouter()


@router.get("")
async def get_instructions(user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("instructions")
        .select("id, rule_text, updated_at")
        .eq("user_id", user.id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if result.data:
        row = result.data[0]
        return {
            "id": row["id"],
            "rule_text": row["rule_text"],
            "updated_at": row["updated_at"],
        }

    return {"rule_text": ""}


@router.put("")
async def update_instructions(data: InstructionUpdate, user=Depends(get_current_user)):
    client = get_supabase_client()

    existing = (
        client.table("instructions")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    now = datetime.now(timezone.utc).isoformat()

    if existing.data:
        row_id = existing.data[0]["id"]
        client.table("instructions").update(
            {"rule_text": data.rule_text, "updated_at": now}
        ).eq("id", row_id).execute()
    else:
        client.table("instructions").insert(
            {
                "user_id": user.id,
                "rule_text": data.rule_text,
                "is_active": True,
            }
        ).execute()

    result = (
        client.table("instructions")
        .select("id, rule_text, updated_at")
        .eq("user_id", user.id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    row = result.data[0]
    return {"rule_text": row["rule_text"], "updated_at": row["updated_at"]}
