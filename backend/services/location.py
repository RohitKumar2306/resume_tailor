import os
import httpx


def resolve_location(
    form_location: str, profile_location: str, client_ip: str
) -> str:
    if form_location and form_location.strip():
        return form_location.strip()

    if profile_location and profile_location.strip():
        return profile_location.strip()

    try:
        base_url = os.getenv("IPAPI_BASE_URL", "https://ipapi.co")
        r = httpx.get(f"{base_url}/{client_ip}/json/", timeout=3.0)
        d = r.json()
        city = d.get("city")
        region = d.get("region_code")
        if city and region:
            return f"{city}, {region}"
    except Exception:
        pass

    return "United States"
