export interface Profile {
  full_name: string | null
  location: string | null
  preferred_llm: "claude" | "gpt4o" | "gemini" | null
}

export interface DocumentItem {
  id: string
  file_name: string
  file_type: "base_resume" | "style_doc" | "format_template"
  uploaded_at: string
  has_template: boolean
}

export interface GenerateRequest {
  location: string
  jd_text: string
  output_format: "pdf" | "docx"
}

export interface GenerateResponse {
  generation_id: string
  ats_score: number
  matched: string[]
  missing: string[]
  download_url: string
  format_template_used: boolean
}

export interface GenerationHistoryItem {
  id: string
  jd_text: string
  location_used: string
  llm_used: string
  ats_score: number
  keyword_coverage: {
    matched: string[]
    missing: string[]
  }
  output_format: "pdf" | "docx"
  output_file_path: string
  format_template_used: boolean
  generated_at: string
}
