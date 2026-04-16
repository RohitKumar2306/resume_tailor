import json
import re


def score_resume(llm, resume_text: str, keywords: dict) -> dict:
    required = keywords.get("required", [])
    preferred = keywords.get("preferred", [])

    prompt = (
        "You are an ATS scoring system.\n"
        "Return ONLY valid JSON. No preamble. No markdown. No explanation.\n"
        'Format: { "score": <int 0-100>, "matched": [...], "missing": [...] }\n\n'
        f"Required: {', '.join(required)}\n"
        f"Preferred: {', '.join(preferred)}\n\n"
        f"Resume:\n{resume_text}"
    )

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
        result = json.loads(content)
        return {
            "score": int(result.get("score", 0)),
            "matched": result.get("matched", []),
            "missing": result.get("missing", []),
        }
    except Exception:
        all_keywords = required + preferred
        return {"score": 0, "matched": [], "missing": all_keywords}


def run_ats_loop(
    llm,
    initial_resume_text: str,
    keywords: dict,
    generate_fn,
    assemble_fn,
    style_chunks: list,
    resume_bullets: list,
    instructions: str,
    location: str,
    jd_text: str,
) -> dict:
    MAX_ITERATIONS = 3
    resume_text = initial_resume_text
    score = 0
    matched = []
    missing = []
    iteration = 0

    while score < 95 and iteration < MAX_ITERATIONS:
        result = score_resume(llm, resume_text, keywords)
        score = result["score"]
        matched = result["matched"]
        missing = result["missing"]

        if score < 95 and iteration < MAX_ITERATIONS - 1:
            prompt = assemble_fn(
                style_chunks,
                resume_bullets,
                instructions,
                keywords,
                location,
                jd_text,
                missing_keywords=missing,
            )
            resume_text = generate_fn(llm, prompt)

        iteration += 1

    return {
        "resume_text": resume_text,
        "ats_score": score,
        "matched": matched,
        "missing": missing,
    }
