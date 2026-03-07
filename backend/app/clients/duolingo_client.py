import httpx

from app.core.config import get_settings
from app.schemas.duolingo import DuolingoUserResponse


class DuolingoClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.duolingo_base_url

    async def fetch_user_profile(self, username: str) -> DuolingoUserResponse:
        url = f"{self.base_url}/users"

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                params={"username": username},
            )
            response.raise_for_status()

        data = response.json()

        if not data.get("users"):
            raise ValueError(f"User '{username}' not found in Duolingo response")

        user_data = data["users"][0]
        return DuolingoUserResponse.model_validate(user_data)