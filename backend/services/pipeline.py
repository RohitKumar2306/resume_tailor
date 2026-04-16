import json
import re
from typing import Optional

from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from services.embedder import embed_query
from services.retriever import retrieve_relevant_chunks


def get_llm(preferred_llm: str, api_key: str):
    if preferred_llm == "claude":
        return ChatAnthropic(model="claude-sonnet-4-20250514", api_key=api_key)
    elif preferred_llm == "gpt4o":
        return ChatOpenAI(model="gpt-4o", api_key=api_key)
    elif preferred_llm == "gemini":
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-pro", google_api_key=api_key
        )
    else:
        raise ValueError(f"Unknown provider: {preferred_llm}")


def extract_keywords(llm, jd_text: str) -> dict:
    prompt = (
        "You are an ATS keyword extraction expert.\n"
        "Extract ALL keywords from the following job description.\n"
        "Return ONLY valid JSON. No preamble. No markdown. No explanation.\n"
        'Format: { "required": [...], "preferred": [...] }\n\n'
        f"Job Description:\n{jd_text}"
    )

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()

        # Strip markdown fences if the LLM wrapped them
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

        return json.loads(content)
    except Exception:
        return {"required": [], "preferred": []}


def assemble_prompt(
    style_chunks: list,
    resume_bullets: list,
    instructions: str,
    keywords: dict,
    location: str,
    jd_text: str,
    missing_keywords: Optional[list] = None,
) -> str:
    required = ", ".join(keywords.get("required", []))
    preferred = ", ".join(keywords.get("preferred", []))

    parts = [
        "You are an expert resume writer and ATS optimization specialist.",
        "",
        "WRITING STYLE REFERENCE:",
        "\n".join(style_chunks) if style_chunks else "(no style reference provided)",
        "",
        "BASE RESUME CONTENT (most relevant sections):",
        "\n".join(resume_bullets) if resume_bullets else "(no base resume content)",
        "",
        "USER INSTRUCTIONS (follow ALL of these strictly):",
        instructions if instructions.strip() else "(no custom instructions)",
        "",
        "KEYWORD CHECKLIST — every item MUST appear naturally in the resume:",
        f"Required: {required}",
        f"Preferred: {preferred}",
    ]

    if missing_keywords:
        missing_str = ", ".join(missing_keywords)
        parts.append("")
        parts.append(
            f"ATTENTION — These keywords MUST appear in this version: {missing_str}"
        )

    parts.extend(
        [
            "",
            f"LOCATION: {location}",
            "",
            "JOB DESCRIPTION:",
            jd_text,
            "",
            "TASK:",
            "Generate a complete tailored resume following all instructions precisely.",
            "Structure every line with these tags so the renderer can apply correct formatting:",
            "[NAME] candidate full name [/NAME]",
            "[CONTACT] phone | email | location | linkedin [/CONTACT]",
            "[HEADER] section title [/HEADER]",
            "[BODY] summary sentence or body text [/BODY]",
            "[BULLET] bullet point text (no leading dash or bullet character) [/BULLET]",
            "Output tagged resume text only. No explanation, no preamble.",
        ]
    )

    return "\n".join(parts)


def generate_resume(llm, prompt: str) -> str:
    response = llm.invoke(prompt)
    return response.content


def run_pipeline(
    preferred_llm: str,
    api_key: str,
    jd_text: str,
    location: str,
    instructions: str,
    user_id: str,
) -> dict:
    llm = get_llm(preferred_llm, api_key)

    # LLM Call 1: keyword extraction
    keywords = extract_keywords(llm, jd_text)

    # Semantic retrieval
    query_embedding = embed_query(jd_text)
    resume_bullets = retrieve_relevant_chunks(
        user_id=user_id,
        query_embedding=query_embedding,
        file_type="base_resume",
        top_k=15,
    )
    style_chunks = retrieve_relevant_chunks(
        user_id=user_id,
        query_embedding=query_embedding,
        file_type="style_doc",
        top_k=5,
    )

    # Assemble prompt and generate
    prompt = assemble_prompt(
        style_chunks=style_chunks,
        resume_bullets=resume_bullets,
        instructions=instructions,
        keywords=keywords,
        location=location,
        jd_text=jd_text,
    )

    # LLM Call 2: resume generation
    resume_text = generate_resume(llm, prompt)

    return {
        "resume_text": resume_text,
        "keywords": keywords,
        "llm_used": preferred_llm,
    }
