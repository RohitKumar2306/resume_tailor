import json
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from services.auth import get_current_user
from services.crypto import decrypt_api_key
from services.location import resolve_location
from services.template import get_styles
from services.pipeline import (
    get_llm,
    extract_keywords,
    assemble_prompt,
    generate_resume,
    run_pipeline,
)
from services.scorer import run_ats_loop
from services.renderer import render_pdf, render_docx
from db.supabase import get_supabase_client
from models.schemas import GenerateRequest, GenerateResponse

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()


@router.post("/generate", response_model=GenerateResponse)
@limiter.limit("10/hour")
async def generate(
    request: Request,
    data: GenerateRequest,
    user=Depends(get_current_user),
):
    client = get_supabase_client()

    try:
        # 1. Load profile
        profile_result = (
            client.table("profiles")
            .select("location, preferred_llm, api_key_encrypted")
            .eq("id", user.id)
            .single()
            .execute()
        )

        if not profile_result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        profile = profile_result.data
        preferred_llm = profile.get("preferred_llm")
        api_key_enc = profile.get("api_key_encrypted")

        # 2. Validate LLM config
        if not preferred_llm or not api_key_enc:
            raise HTTPException(
                status_code=400,
                detail="Please configure your LLM and API key in Settings",
            )

        # 3. Decrypt API key in memory
        try:
            api_key = decrypt_api_key(api_key_enc)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Failed to decrypt API key. Please re-save your key in Settings.",
            )

        # 4. Load instructions
        instr_result = (
            client.table("instructions")
            .select("rule_text")
            .eq("user_id", user.id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )
        instructions = ""
        if instr_result.data:
            instructions = instr_result.data[0].get("rule_text", "")

        # 5. Resolve location
        resolved_location = resolve_location(
            data.location,
            profile.get("location", ""),
            request.client.host if request.client else "",
        )

        # 6. Load format template styles + check for template file
        styles = get_styles(user.id)

        template_result = (
            client.table("documents")
            .select("id, storage_path")
            .eq("user_id", user.id)
            .eq("file_type", "format_template")
            .limit(1)
            .execute()
        )
        has_template = bool(template_result.data)
        template_docx_bytes = None

        if has_template:
            storage_path = template_result.data[0]["storage_path"]
            try:
                file_response = client.storage.from_("documents").download(
                    storage_path
                )
                template_docx_bytes = file_response
            except Exception:
                template_docx_bytes = None

        # 7. Run pipeline (keyword extraction + semantic retrieval + generation)
        pipeline_result = run_pipeline(
            preferred_llm=preferred_llm,
            api_key=api_key,
            jd_text=data.jd_text,
            location=resolved_location,
            instructions=instructions,
            user_id=user.id,
        )

        resume_text = pipeline_result["resume_text"]
        keywords = pipeline_result["keywords"]
        llm_used = pipeline_result["llm_used"]

        # 8. ATS scoring loop
        llm = get_llm(preferred_llm, api_key)

        from services.embedder import embed_query
        from services.retriever import retrieve_relevant_chunks

        query_embedding = embed_query(data.jd_text)
        resume_bullets = retrieve_relevant_chunks(
            user_id=user.id,
            query_embedding=query_embedding,
            file_type="base_resume",
            top_k=15,
        )
        style_chunks = retrieve_relevant_chunks(
            user_id=user.id,
            query_embedding=query_embedding,
            file_type="style_doc",
            top_k=5,
        )

        ats_result = run_ats_loop(
            llm=llm,
            initial_resume_text=resume_text,
            keywords=keywords,
            generate_fn=generate_resume,
            assemble_fn=assemble_prompt,
            style_chunks=style_chunks,
            resume_bullets=resume_bullets,
            instructions=instructions,
            location=resolved_location,
            jd_text=data.jd_text,
        )

        final_resume = ats_result["resume_text"]
        ats_score = ats_result["ats_score"]
        matched = ats_result["matched"]
        missing = ats_result["missing"]

        # 9. Render output
        if data.output_format == "pdf":
            file_bytes = render_pdf(final_resume, styles)
            ext = "pdf"
        else:
            file_bytes = render_docx(final_resume, styles, template_docx_bytes)
            ext = "docx"

        # 10. Upload to Supabase Storage
        file_id = str(uuid.uuid4())
        storage_path = f"{user.id}/{file_id}_resume.{ext}"

        content_types = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        client.storage.from_("generated").upload(
            storage_path,
            file_bytes,
            {"content-type": content_types[ext]},
        )

        # 11. Generate signed URL (1 hour)
        signed = client.storage.from_("generated").create_signed_url(
            storage_path, 3600
        )
        download_url = signed.get("signedURL", "") if isinstance(signed, dict) else ""

        # 12. Insert generation record
        gen_row = (
            client.table("generations")
            .insert(
                {
                    "user_id": user.id,
                    "jd_text": data.jd_text,
                    "location_used": resolved_location,
                    "llm_used": llm_used,
                    "ats_score": ats_score,
                    "keyword_coverage": json.dumps(
                        {"matched": matched, "missing": missing}
                    ),
                    "output_format": data.output_format,
                    "output_file_path": storage_path,
                    "instructions_snapshot": instructions,
                    "format_template_used": has_template,
                }
            )
            .execute()
        )

        generation_id = gen_row.data[0]["id"]

        # 13. Return response
        return GenerateResponse(
            generation_id=generation_id,
            ats_score=ats_score,
            matched=matched,
            missing=missing,
            download_url=download_url,
            format_template_used=has_template,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Generation failed")
        raise HTTPException(
            status_code=500, detail=f"Generation failed: {str(e)}"
        )
