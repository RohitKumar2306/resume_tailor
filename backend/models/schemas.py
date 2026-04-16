from typing import Optional
from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    preferred_llm: Optional[str] = None
    api_key: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    uploaded_at: str
    has_template: bool = False


class InstructionUpdate(BaseModel):
    rule_text: str = Field(..., max_length=5000)


class GenerateRequest(BaseModel):
    location: str = Field(..., max_length=100)
    jd_text: str = Field(..., max_length=10000)
    output_format: str = Field(..., pattern=r"^(pdf|docx)$")


class GenerateResponse(BaseModel):
    generation_id: str
    ats_score: int
    matched: list[str]
    missing: list[str]
    download_url: str
    format_template_used: bool


class GenerationHistoryItem(BaseModel):
    id: str
    jd_text: str
    location_used: str
    llm_used: str
    ats_score: int
    keyword_coverage: dict
    output_format: str
    output_file_path: str
    format_template_used: bool
    generated_at: str
