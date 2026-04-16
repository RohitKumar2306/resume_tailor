from fastapi import Header, HTTPException
from db.supabase import get_supabase_client


async def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        client = get_supabase_client()
        response = client.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
