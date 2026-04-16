from db.supabase import get_supabase_client


def retrieve_relevant_chunks(
    user_id: str, query_embedding: list, file_type: str, top_k: int
) -> list:
    client = get_supabase_client()

    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    result = client.rpc(
        "match_document_chunks",
        {
            "p_user_id": user_id,
            "p_file_type": file_type,
            "p_embedding": embedding_str,
            "p_top_k": top_k,
        },
    ).execute()

    if result.data:
        return [row["chunk_text"] for row in result.data]

    return []
