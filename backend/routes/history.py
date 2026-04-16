import json

from fastapi import APIRouter, Depends, HTTPException
from db.supabase import get_supabase_client
from services.auth import get_current_user

router = APIRouter()


@router.get("")
async def list_generations(user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", desc=True)
        .execute()
    )

    items = []
    for row in result.data or []:
        kc = row.get("keyword_coverage", {})
        if isinstance(kc, str):
            try:
                kc = json.loads(kc)
            except Exception:
                kc = {"matched": [], "missing": []}

        items.append(
            {
                "id": row["id"],
                "jd_text": row["jd_text"],
                "location_used": row["location_used"],
                "llm_used": row["llm_used"],
                "ats_score": row["ats_score"],
                "keyword_coverage": kc,
                "output_format": row["output_format"],
                "output_file_path": row["output_file_path"],
                "format_template_used": row.get("format_template_used", False),
                "generated_at": row["generated_at"],
            }
        )

    return items


@router.get("/{generation_id}")
async def get_generation(generation_id: str, user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("generations")
        .select("*")
        .eq("id", generation_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Generation not found")

    row = result.data
    if row["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    kc = row.get("keyword_coverage", {})
    if isinstance(kc, str):
        try:
            kc = json.loads(kc)
        except Exception:
            kc = {"matched": [], "missing": []}

    return {
        "id": row["id"],
        "jd_text": row["jd_text"],
        "location_used": row["location_used"],
        "llm_used": row["llm_used"],
        "ats_score": row["ats_score"],
        "keyword_coverage": kc,
        "output_format": row["output_format"],
        "output_file_path": row["output_file_path"],
        "format_template_used": row.get("format_template_used", False),
        "generated_at": row["generated_at"],
    }


@router.get("/{generation_id}/download")
async def download_generation(generation_id: str, user=Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        client.table("generations")
        .select("user_id, output_file_path")
        .eq("id", generation_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Generation not found")

    row = result.data
    if row["user_id"] != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    signed = client.storage.from_("generated").create_signed_url(
        row["output_file_path"], 3600
    )

    url = ""
    if isinstance(signed, dict):
        url = signed.get("signedURL", "") or signed.get("signedUrl", "")

    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate download URL")

    return {"download_url": url}
