# ResumeTailor

AI-powered resume tailoring that generates ATS-optimized resumes for every job description. Paste a JD, pick your LLM, and get a formatted resume with a 95+ ATS score — using your own writing style and format template.

Each user brings their own API key (Claude, GPT-4o, or Gemini). Upload a DOCX resume as your format template to match your existing visual style.

## Tech Stack

| Layer     | Technology                                                     |
| --------- | -------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui            |
| Backend   | FastAPI, Python 3.11+, LangChain, Sentence-Transformers        |
| Database  | Supabase (PostgreSQL + pgvector + Auth + Storage)               |
| Rendering | python-docx (DOCX), WeasyPrint (PDF)                           |
| Deploy    | Vercel (frontend), Render (backend)                             |

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project with the schema applied (see [Database Setup](#database-setup))

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your values
npm run dev                   # http://localhost:5173
```

**Required env vars** (`frontend/.env.local`):

| Variable                | Description                        |
| ----------------------- | ---------------------------------- |
| `VITE_SUPABASE_URL`     | Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY`| Supabase anon (public) key         |
| `VITE_API_BASE_URL`     | Backend URL (`http://localhost:8000` for local) |

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in your values
uvicorn main:app --reload     # http://localhost:8000
```

**Required env vars** (`backend/.env`):

| Variable                      | Description                              |
| ----------------------------- | ---------------------------------------- |
| `SUPABASE_URL`                | Supabase project URL                     |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase service role key (server only)  |
| `FERNET_KEY`                  | Encryption key for user API keys         |
| `FRONTEND_URL`                | Frontend origin for CORS                 |

### Generate a Fernet Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**This key must never change after users store encrypted API keys.** If lost, all stored API keys become unrecoverable. Back it up securely.

## Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the full contents of `backend/db/schema.sql`.
3. Create two **private** storage buckets: `documents` and `generated`.
4. Add RLS policies for both buckets (INSERT, SELECT, DELETE):

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. Create a new Vercel project, set **Root Directory** to `frontend/`.
3. Add the three `VITE_*` environment variables.
4. Deploy. Set `VITE_API_BASE_URL` to your Render backend URL after backend deploys.

### Backend → Render

1. Create a new Web Service, connect the GitHub repo.
2. Set **Root Directory** to `backend/`, Runtime to **Python 3**.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add all four backend environment variables. Set `FRONTEND_URL` to your Vercel URL.

### Post-Deploy

Update `FRONTEND_URL` on Render to point to the Vercel URL, and `VITE_API_BASE_URL` on Vercel to point to the Render URL. Redeploy both if needed.

## Features

- **Semantic retrieval** — uploads are chunked and embedded with Sentence-Transformers; the most relevant fragments are injected into each generation prompt
- **ATS scoring loop** — an LLM scores the generated resume against the JD; if < 95 it regenerates with feedback, up to 3 attempts
- **Format template** — upload a DOCX and its fonts, sizes, colors, and spacing are replicated in every output
- **BYOK** — each user stores their own LLM API key, encrypted at rest with Fernet
- **Rate limiting** — 10 generations per hour per IP
