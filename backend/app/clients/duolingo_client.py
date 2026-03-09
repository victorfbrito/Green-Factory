"""Duolingo client. Uses only the public endpoint: GET /2017-06-30/users?username={username}."""

import httpx

from app.core.config import get_settings
from app.schemas.duolingo import DuolingoUserResponse


class DuolingoClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.duolingo_base_url

    async def fetch_user_by_username(self, username: str) -> DuolingoUserResponse:
        """Fetch user profile from public endpoint. No auth required."""
        url = f"{self.base_url}/users"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params={"username": username})
            response.raise_for_status()
            payload = response.json()
        users = payload.get("users", [])
        if not users:
            raise ValueError(f"User '{username}' not found")
        return DuolingoUserResponse.model_validate(users[0])