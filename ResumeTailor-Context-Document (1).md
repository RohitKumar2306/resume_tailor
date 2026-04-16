# ResumeTailor — Full Project Context Document
> This document is the single source of truth for the ResumeTailor application. Any AI, developer, or contributor must read this entirely before writing any code or making any architectural decision.

---

## 1. Project Overview

ResumeTailor is a multi-user, cloud-hosted, AI-powered resume generation platform. Users upload their base resumes, writing style reference documents, and a formatting template resume, paste a Job Description, set their location, choose an output format, and receive a tailored resume with a guaranteed 95+ ATS score — powered by their own LLM API key.

The platform is completely dynamic. Nothing is hardcoded. Every rule, every base resume, every style reference, every visual format, and every LLM choice is supplied by the user at runtime.

---

## 2. Core Requirements

### 2.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-01 | User must be able to upload any number of base resumes (PDF or DOCX) |
| FR-02 | User must be able to upload any number of writing style reference documents |
| FR-03 | User must be able to enter and save custom instructions/rules that persist across sessions |
| FR-04 | System must tailor resumes according to the uploaded base resumes, style documents, and custom instructions |
| FR-05 | System must achieve ATS score of 95 or above for every generated resume |
| FR-06 | Every JD and its corresponding generated resume must be stored together permanently |
| FR-07 | Generate screen must have a separate Location text field (pre-filled with user's base location, editable per generation) |
| FR-08 | Generate screen must have a separate Job Description textarea |
| FR-09 | User must choose output format — PDF or DOCX — per generation |
| FR-10 | User must be able to provide their own API key (Claude, GPT-4o, or Gemini) |
| FR-11 | System must support login so all data is accessible from any device |
| FR-12 | ATS score must be stored and displayed for every generation in history |
| FR-13 | Keyword coverage breakdown (matched and missing) must be stored per generation |
| FR-14 | User must be able to set a base location in their profile (used as default on Generate screen) |
| FR-15 | If no location is set, system must auto-detect via IP geolocation and use as default |
| FR-16 | User must be able to upload exactly one DOCX file as a visual formatting template |
| FR-17 | The format template defines fonts, spacing, colors, and section layout used in all generated resumes |
| FR-18 | Uploading a new format template must replace the existing one — only one allowed per user at a time |
| FR-19 | If no format template is uploaded, the system must use a built-in default clean template |
| FR-20 | Format template styles must be extracted and stored as JSON on upload, then applied at render time |

### 2.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | All data must be accessible from any device after login |
| NFR-02 | API keys must be encrypted at rest — never stored in plaintext |
| NFR-03 | API keys must never be returned to the frontend after being saved |
| NFR-04 | Every user must only see their own data — strict row-level isolation |
| NFR-05 | System must be deployable entirely on free-tier services |
| NFR-06 | Backend must validate JWT on every protected endpoint |
| NFR-07 | File uploads must be validated for type and size before processing |
| NFR-08 | All environment variables must be stored in .env files, never hardcoded |
| NFR-09 | Format template file must be DOCX only — PDF is not accepted for this purpose |

---

## 3. Tech Stack — Complete List

### 3.1 Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| React | 18+ | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 5+ | Build tool |
| shadcn/ui | Latest | Component library (Radix-based) |
| Tailwind CSS | 3+ | Utility-first styling |
| React Router | 6+ | Client-side routing |
| Supabase JS Client | 2+ | Auth + DB + Storage from frontend |
| Axios | 1+ | HTTP client for FastAPI calls |

### 3.2 Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | REST API framework |
| Uvicorn | Latest | ASGI server |
| python-multipart | Latest | File upload handling |
| PyMuPDF (fitz) | Latest | PDF text extraction |
| python-docx | Latest | DOCX text extraction + style reading + generation |
| WeasyPrint | Latest | HTML-to-PDF rendering |
| sentence-transformers | Latest | Local embedding generation |
| LangChain | 0.2+ | AI orchestration, chains, retrieval |
| langchain-anthropic | Latest | Claude LLM adapter |
| langchain-openai | Latest | GPT-4o LLM adapter |
| langchain-google-genai | Latest | Gemini LLM adapter |
| cryptography (Fernet) | Latest | API key encryption/decryption |
| supabase-py | Latest | Supabase Python client |
| python-jose | Latest | JWT validation |
| pydantic | 2+ | Request/response schemas |
| python-dotenv | Latest | Environment variable loading |
| httpx | Latest | Async HTTP client |
| slowapi | Latest | Rate limiting |

### 3.3 Infrastructure & Services
| Service | Free Tier | Purpose |
|---------|-----------|---------|
| Supabase | 500MB DB, 1GB storage, unlimited auth | Auth + PostgreSQL + pgvector + Storage |
| Vercel | Unlimited for personal | Frontend hosting |
| Render.com | Free web service | Backend hosting |
| ipapi.co | 1000 req/day free | IP geolocation for default location |

### 3.4 LLM Providers (User-Supplied Keys)
| Provider | Model |
|----------|-------|
| Anthropic | claude-sonnet-4-20250514 |
| OpenAI | gpt-4o |
| Google | gemini-1.5-pro |

---

## 4. Architecture

### 4.1 System Layers

```
Layer 1 — Frontend (React + TypeScript + Vite)
    Hosted on Vercel
    ↕ HTTPS (JWT in Authorization header)
Layer 2 — Backend API (FastAPI + Python)
    Hosted on Render.com
    ↕ Supabase Python Client + pgvector queries
Layer 3 — Storage (Supabase)
    Auth | PostgreSQL + pgvector | Storage Buckets
    ↕ Decrypted API key used at generation time only
Layer 4 — AI Orchestration (LangChain)
    Keyword extraction → semantic retrieval → prompt assembly → generation
    ↕ LLM API call using user's own key
Layer 5 — Output Generation
    ATS scoring loop → format template applied → PDF or DOCX → Supabase Storage
```

### 4.2 Request Flow — End to End

```
1.  User fills Generate form: Location + JD text + Output format
2.  Frontend sends POST /generate with JWT in header
3.  FastAPI validates JWT via Supabase Auth
4.  Backend loads user profile: saved instructions, base location fallback
5.  Location resolved: form field value → profile location → IP geolocation → "United States"
6.  User's encrypted API key fetched from DB and decrypted in memory (never logged)
7.  Backend loads format template:
        If user has uploaded a format_template → load styles_snapshot JSON from documents table
        If not → use built-in default styles JSON
8.  LangChain Step 1 — Keyword Extraction (LLM Call 1):
        Input: JD text
        Output: { required: [...], preferred: [...] }
9.  LangChain Step 2 — Semantic Retrieval (pgvector):
        Embed JD text using sentence-transformers
        Query document_chunks for top 15 most relevant bullets (base_resume only)
        Query document_chunks for top 5 style reference chunks (style_doc only)
        Format template is never queried here
10. LangChain Step 3 — Dynamic Prompt Assembly:
        [Role] + [Style chunks] + [Retrieved bullets] +
        [Saved instructions] + [Keyword checklist] + [JD text] + [Task]
11. LangChain Step 4 — Resume Generation (LLM Call 2):
        Full prompt → LLM → structured resume text
12. LangChain Step 5 — ATS Scoring (LLM Call 3):
        Compare resume vs keyword checklist
        Returns { score: int, matched: [...], missing: [...] }
13. If score < 95 → regenerate with missing keywords listed (up to 3 iterations)
14. Output rendering using styles_snapshot:
        if format == "pdf" → build styled HTML → WeasyPrint renders PDF
        if format == "docx" → load template DOCX as base → inject content → save DOCX
15. Output file uploaded to Supabase Storage
16. Row inserted into generations table
17. Frontend receives: ats_score, matched, missing, download_url
```

---

## 5. Database Schema (Supabase PostgreSQL)

### 5.1 profiles
```sql
CREATE TABLE profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name         TEXT,
    location          TEXT,
    preferred_llm     TEXT CHECK (preferred_llm IN ('claude', 'gpt4o', 'gemini')),
    api_key_encrypted TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 documents
```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL CHECK (
                        file_type IN ('base_resume', 'style_doc', 'format_template')
                    ),
    storage_path    TEXT NOT NULL,
    parsed_text     TEXT,            -- populated for base_resume and style_doc; NULL for format_template
    styles_snapshot JSONB,           -- populated for format_template only; NULL for others
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 document_chunks (pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_text      TEXT NOT NULL,
    embedding       VECTOR(384),
    chunk_index     INTEGER NOT NULL
);

CREATE INDEX ON document_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

Note: document_chunks rows are only created for base_resume and style_doc types. Format templates are never chunked or embedded.

### 5.4 instructions
```sql
CREATE TABLE instructions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rule_text   TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.5 generations
```sql
CREATE TABLE generations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    jd_text               TEXT NOT NULL,
    location_used         TEXT NOT NULL,
    llm_used              TEXT NOT NULL,
    ats_score             INTEGER NOT NULL,
    keyword_coverage      JSONB NOT NULL,
    output_format         TEXT NOT NULL CHECK (output_format IN ('pdf', 'docx')),
    output_file_path      TEXT NOT NULL,
    instructions_snapshot TEXT NOT NULL,
    format_template_used  BOOLEAN DEFAULT FALSE,
    generated_at          TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 Row Level Security (RLS) — CRITICAL

```sql
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"      ON profiles        FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_documents"    ON documents       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_chunks"       ON document_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_instructions" ON instructions    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_generations"  ON generations     FOR ALL USING (auth.uid() = user_id);
```

### 5.7 Auto-create Profile Trigger
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. Backend API Endpoints

All endpoints except /health require: `Authorization: Bearer <supabase_access_token>`

```
GET    /health

# PROFILE
GET    /profile                          → full_name, location, preferred_llm (NO api_key)
PUT    /profile                          → update profile fields + api_key

# DOCUMENTS
POST   /documents/upload                 → upload base_resume or style_doc (PDF or DOCX)
POST   /documents/upload-template        → upload format_template (DOCX only, replaces existing)
GET    /documents                        → list all user documents grouped by type
DELETE /documents/{id}                   → delete document + chunks + storage file

# INSTRUCTIONS
GET    /instructions                     → active instruction block
PUT    /instructions                     → create or update instruction block

# GENERATE
POST   /generate
       Request:  { location, jd_text, output_format }
       Response: { generation_id, ats_score, matched, missing, download_url }

# HISTORY
GET    /generations                      → all past generations newest first
GET    /generations/{id}                 → single generation detail
GET    /generations/{id}/download        → fresh signed URL (1hr expiry)
```

---

## 7. Format Template Feature — Full Specification

### 7.1 What It Is
A single DOCX file uploaded by the user that defines the visual appearance of every generated resume. The backend extracts font, color, spacing, and layout settings from it and stores them as a `styles_snapshot` JSON. At render time, this snapshot is applied to the output — meaning generated resumes look identical in style to the uploaded template.

### 7.2 Rules
- DOCX only. PDF is rejected with HTTP 400.
- Max 10MB.
- One per user at any time. New upload replaces old one (delete old Storage file + DB row first).
- Not embedded or chunked — used only for visual rendering.

### 7.3 styles_snapshot JSON Structure
```json
{
  "page": {
    "width_dxa": 12240,
    "height_dxa": 15840,
    "margin_top_dxa": 1080,
    "margin_bottom_dxa": 1080,
    "margin_left_dxa": 1080,
    "margin_right_dxa": 1080
  },
  "name_style": {
    "font_name": "Calibri",
    "font_size_pt": 18,
    "bold": true,
    "color_hex": "1a2744"
  },
  "section_header_style": {
    "font_name": "Calibri",
    "font_size_pt": 11,
    "bold": true,
    "all_caps": true,
    "color_hex": "1a2744",
    "bottom_border": true
  },
  "body_style": {
    "font_name": "Calibri",
    "font_size_pt": 10,
    "bold": false,
    "color_hex": "000000",
    "line_spacing_pt": 12
  },
  "bullet_style": {
    "indent_left_dxa": 360,
    "hanging_dxa": 180,
    "space_after_pt": 2
  }
}
```

### 7.4 Default Built-in Styles (Used When No Template Uploaded)
```json
{
  "page": { "width_dxa": 12240, "height_dxa": 15840,
            "margin_top_dxa": 1080, "margin_bottom_dxa": 1080,
            "margin_left_dxa": 1080, "margin_right_dxa": 1080 },
  "name_style": { "font_name": "Calibri", "font_size_pt": 18,
                  "bold": true, "color_hex": "1a2744" },
  "section_header_style": { "font_name": "Calibri", "font_size_pt": 11,
                             "bold": true, "all_caps": true,
                             "color_hex": "1a2744", "bottom_border": true },
  "body_style": { "font_name": "Calibri", "font_size_pt": 10,
                  "bold": false, "color_hex": "000000", "line_spacing_pt": 12 },
  "bullet_style": { "indent_left_dxa": 360, "hanging_dxa": 180, "space_after_pt": 2 }
}
```

### 7.5 Rendering with Template Styles

**DOCX output:**
- Load the user's format_template DOCX from Supabase Storage as the base document
- Clear all existing paragraph content (preserve the named styles inside the document)
- Parse generated resume text by structured tags: [NAME], [HEADER], [BULLET], [BODY]
- Inject each piece using the corresponding named style from the template
- Save and upload to Supabase Storage

**PDF output:**
- Build HTML string using styles_snapshot values as inline CSS
- Page size, fonts, colors, spacing all driven by the snapshot
- WeasyPrint renders the HTML to PDF bytes
- Upload to Supabase Storage

---

## 8. Document Processing Pipeline

### 8.1 base_resume and style_doc Upload
```
1. Validate: extension must be .pdf or .docx
2. Validate: size must be under 10MB
3. Validate magic bytes (PDF: %PDF, DOCX: PK ZIP header)
4. Upload to Supabase Storage: bucket="documents", path="{user_id}/{file_type}/{uuid}_{name}"
5. Extract text: PDF → PyMuPDF, DOCX → python-docx
6. Insert into documents table (parsed_text populated, styles_snapshot = NULL)
7. Chunk text: split by newline, filter < 20 chars, strip whitespace
8. Embed chunks with sentence-transformers all-MiniLM-L6-v2 (384 dims)
9. Insert all chunks into document_chunks with embeddings
10. Return DocumentResponse
```

### 8.2 format_template Upload
```
1. Validate: extension must be .docx ONLY — reject PDF with HTTP 400
2. Validate: size under 10MB
3. Validate magic bytes (PK ZIP header)
4. Check for existing format_template row for this user:
   If found → delete old Supabase Storage file, delete old documents row
5. Upload new file: bucket="documents", path="{user_id}/format_template/{uuid}_{name}"
6. Extract styles_snapshot using template service
7. Insert into documents table (parsed_text = NULL, styles_snapshot = extracted JSON)
8. Do NOT create any document_chunks rows
9. Return DocumentResponse
```

---

## 9. AI Pipeline — Detailed

### 9.1 Keyword Extraction Prompt (LLM Call 1)
```
You are an ATS keyword extraction expert.
Extract ALL keywords from the following job description.
Return ONLY valid JSON. No preamble. No markdown. No explanation.
Format: { "required": [...], "preferred": [...] }
Job Description: {jd_text}
```

### 9.2 Semantic Retrieval
- Embed JD text using sentence-transformers/all-MiniLM-L6-v2
- pgvector cosine similarity on document_chunks filtered by user_id
- Top 15 from file_type = 'base_resume'
- Top 5 from file_type = 'style_doc'
- format_template never queried

### 9.3 Generation Prompt (LLM Call 2)
```
You are an expert resume writer and ATS optimization specialist.

WRITING STYLE REFERENCE:
{style_chunks}

BASE RESUME CONTENT (most relevant sections):
{retrieved_bullets}

USER INSTRUCTIONS (follow ALL of these strictly):
{saved_instructions}

KEYWORD CHECKLIST (every item MUST appear naturally in the resume):
Required: {required_keywords}
Preferred: {preferred_keywords}

[If regenerating with gaps:]
ATTENTION — These keywords MUST appear in this version: {missing_keywords}

LOCATION: {resolved_location}

JOB DESCRIPTION:
{jd_text}

TASK:
Generate a complete tailored resume. Follow all instructions precisely.
Structure output using these tags so the renderer can apply formatting:
[NAME] candidate name [/NAME]
[CONTACT] contact line [/CONTACT]
[HEADER] section title [/HEADER]
[BODY] body line or summary sentence [/BODY]
[BULLET] bullet point text [/BULLET]
Output tagged resume text only. No explanation.
```

### 9.4 ATS Scoring Prompt (LLM Call 3)
```
You are an ATS scoring system.
Return ONLY valid JSON. No preamble. No markdown.
Format: { "score": <int 0-100>, "matched": [...], "missing": [...] }
Required: {required_keywords}
Preferred: {preferred_keywords}
Resume: {generated_resume}
```

### 9.5 ATS Loop
```python
MAX_ITERATIONS = 3
while score < 95 and iteration < MAX_ITERATIONS:
    if iteration > 0:
        resume_text = regenerate_with_gaps(missing_keywords)
    result = score_resume(resume_text, keywords)
    score, matched, missing = result["score"], result["matched"], result["missing"]
    iteration += 1
```

---

## 10. Security Protocols

### 10.1 Authentication
```python
async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    user = supabase_client.auth.get_user(token)
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user.user
```

### 10.2 API Key Security
```python
from cryptography.fernet import Fernet
cipher = Fernet(os.getenv("FERNET_KEY"))

def encrypt_api_key(raw: str) -> str:
    return cipher.encrypt(raw.encode()).decode()

def decrypt_api_key(enc: str) -> str:
    return cipher.decrypt(enc.encode()).decode()
```
- FERNET_KEY in backend .env only — never in DB or frontend
- api_key_encrypted NEVER returned in any API response
- Decrypted in memory at generation time only — never logged

### 10.3 Row Level Security
RLS enabled on all 5 tables. Every row filtered by auth.uid() = user_id at DB level.
See Section 5.6 for full SQL.

### 10.4 File Upload Security
```python
MAGIC_BYTES = { ".pdf": b"%PDF", ".docx": b"PK\x03\x04" }

def validate_upload(file_bytes, extension, allowed_extensions):
    if extension not in allowed_extensions:
        raise HTTPException(400, f"Only {allowed_extensions} accepted")
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Max file size is 10MB")
    expected = MAGIC_BYTES.get(extension)
    if expected and not file_bytes[:len(expected)].startswith(expected):
        raise HTTPException(400, "File content does not match its extension")
```
- base_resume / style_doc: .pdf or .docx
- format_template: .docx ONLY
- All files in private Supabase Storage buckets
- All downloads via signed URLs (1-hour expiry)

### 10.5 Environment Variables
Backend .env:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FERNET_KEY=
FRONTEND_URL=
IPAPI_BASE_URL=https://ipapi.co
```
Frontend .env.local:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```
Both files in .gitignore. Never committed.

### 10.6 CORS
```python
app.add_middleware(CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","DELETE"],
    allow_headers=["Authorization","Content-Type"])
```

### 10.7 Input Validation
- JD text: max 10,000 chars | Location: max 100 chars | Instructions: max 5,000 chars
- output_format: must match ^(pdf|docx)$
- All DB queries via Supabase client — parameterized, no SQL injection possible

### 10.8 Rate Limiting
- POST /generate: max 10 per user per hour via slowapi
- Exceeded → HTTP 429

---

## 11. Frontend Screens

### 11.1 Auth (/auth)
Email + password sign up and login via Supabase Auth. Redirect to Settings on first login if profile incomplete.

### 11.2 Settings (/settings)
Full name, base location (IP geolocation fallback), preferred LLM, masked API key input. Save → PUT /profile.

### 11.3 Documents (/documents) — THREE SECTIONS
```
Section 1 — Base Resumes
  Accepts: PDF or DOCX | Max 10MB | Multiple files
  Purpose: Content source for semantic retrieval

Section 2 — Style & Reference Documents
  Accepts: PDF or DOCX | Max 10MB | Multiple files
  Purpose: Writing style guidance for LLM

Section 3 — Format Template
  Accepts: DOCX ONLY | Max 10MB | ONE file at a time
  Purpose: Visual formatting blueprint (fonts, colors, spacing)
  Note shown: "DOCX only. This defines how your resume looks."
  Replacing: new upload auto-removes existing template
```

### 11.4 Instructions (/instructions)
Large textarea, pre-loaded, character count (max 5000), auto-save on blur.

### 11.5 Generate (/generate)
```
┌──────────────────────────────────────┐
│  Location                            │
│  [ Chicago, IL         ]             │
│  (pre-filled, editable per run)      │
│                                      │
│  Job Description                     │
│  [                                 ] │
│  [   paste full JD text here       ] │
│  [                                 ] │
│                                      │
│  Output Format                       │
│  ○ PDF    ○ DOCX                     │
│                                      │
│  [ Generate Resume ]                 │
└──────────────────────────────────────┘
```

### 11.6 History (/history)
All generations newest first. Each card: JD preview, ATS score badge, location, format, date, keyword breakdown (collapsible), download button.

---

## 12. Location Resolution

```python
def resolve_location(form_location, profile_location, client_ip) -> str:
    if form_location and form_location.strip():
        return form_location.strip()
    if profile_location and profile_location.strip():
        return profile_location.strip()
    try:
        r = requests.get(f"https://ipapi.co/{client_ip}/json/", timeout=3)
        d = r.json()
        if d.get("city") and d.get("region_code"):
            return f"{d['city']}, {d['region_code']}"
    except Exception:
        pass
    return "United States"
```

Resolved server-side. Injected into resume header. Stored in location_used. Never overwrites profile base location.

---

## 13. Project Folder Structure

```
resume-tailor/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── Generate.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── Instructions.tsx
│   │   │   ├── History.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ATSScoreBadge.tsx
│   │   │   ├── FileUploadZone.tsx
│   │   │   └── GenerationCard.tsx
│   │   ├── lib/
│   │   │   ├── supabaseClient.ts
│   │   │   └── apiClient.ts
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.local
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── routes/
│   │   ├── profile.py
│   │   ├── documents.py
│   │   ├── instructions.py
│   │   ├── generate.py
│   │   └── history.py
│   ├── services/
│   │   ├── auth.py         # JWT validation dependency
│   │   ├── parser.py       # PyMuPDF + python-docx text extraction
│   │   ├── embedder.py     # sentence-transformers
│   │   ├── retriever.py    # pgvector semantic search
│   │   ├── pipeline.py     # LangChain orchestration
│   │   ├── scorer.py       # ATS scoring loop
│   │   ├── renderer.py     # WeasyPrint PDF + python-docx DOCX output
│   │   ├── template.py     # Format template style extraction + application  ← NEW
│   │   ├── crypto.py       # Fernet encrypt/decrypt
│   │   └── location.py     # location resolution logic
│   ├── models/
│   │   └── schemas.py      # Pydantic models
│   ├── db/
│   │   └── supabase.py     # Supabase client singleton
│   ├── .env
│   └── requirements.txt
│
└── README.md
```

---

## 14. Deployment

### 14.1 Frontend → Vercel
Root directory: `frontend/` | Build: `npm run build` | Output: `dist`
Add all VITE_ env vars in Vercel dashboard. Auto-deploys on push to main.

### 14.2 Backend → Render.com
Root directory: `backend/` | Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
Add all backend env vars in Render dashboard.

### 14.3 Supabase
Run schema.sql in SQL editor. Enable pgvector. Create two private storage buckets: `documents` and `generated`.

---

## 15. Key Design Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Format template DOCX only | python-docx reads and reuses Word styles directly — PDF has no accessible style layer |
| One format template per user | Multiple templates would require selection UI — unnecessary complexity for V1 |
| styles_snapshot as JSONB | Decouples rendering from the file — renderer works even if Storage file is unavailable |
| Default styles always available | Users can generate immediately without uploading a template |
| Template not chunked/embedded | Template is only for visual rendering, never for content retrieval |
| Tagged output from LLM | [NAME][HEADER][BULLET][BODY] tags let renderer apply correct style per element |
| pgvector over ChromaDB | Everything stays in Supabase — one service, free, no extra config |
| sentence-transformers local | Free, no API call for embeddings |
| Fernet for API key encryption | Symmetric, simple, battle-tested |
| RLS at DB level | Security at data layer, not just application layer |
| User supplies own API key | Platform owner pays $0 for LLM calls |
| instructions_snapshot in generations | Audit trail of exactly which rules produced each resume |
| Signed URLs for downloads | Files never publicly accessible |
| Location resolved server-side | Prevents client spoofing |

---

*End of context document. Every implementation decision must be consistent with the requirements, architecture, and security protocols defined here.*
