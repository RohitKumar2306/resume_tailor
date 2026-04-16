from typing import Optional
from sentence_transformers import SentenceTransformer

_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_chunks(chunks: list) -> list:
    if not chunks:
        return []
    model = _get_model()
    embeddings = model.encode(chunks, convert_to_numpy=True)
    return [emb.tolist() for emb in embeddings]


def embed_query(query: str) -> list:
    model = _get_model()
    embedding = model.encode([query], convert_to_numpy=True)[0]
    return embedding.tolist()
