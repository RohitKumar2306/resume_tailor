-- ResumeTailor — Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. profiles table
CREATE TABLE profiles (
    id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name         TEXT,
    location          TEXT,
    preferred_llm     TEXT CHECK (preferred_llm IN ('claude', 'gpt4o', 'gemini')),
    api_key_encrypted TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. documents table
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL CHECK (
                        file_type IN ('base_resume', 'style_doc', 'format_template')
                    ),
    storage_path    TEXT NOT NULL,
    parsed_text     TEXT,
    styles_snapshot JSONB,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. document_chunks table (pgvector)
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

-- 5. instructions table
CREATE TABLE instructions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rule_text   TEXT NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. generations table
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

-- 7. Row Level Security
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"
    ON profiles FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "users_own_documents"
    ON documents FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "users_own_chunks"
    ON document_chunks FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "users_own_instructions"
    ON instructions FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "users_own_generations"
    ON generations FOR ALL
    USING (auth.uid() = user_id);

-- 8. Auto-create profile on new user signup
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
