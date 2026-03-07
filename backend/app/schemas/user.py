from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    avatar_url: str | None
    timezone: str | None
    streak: int
    streak_extended_today: bool
    total_xp: int
    last_synced_at: datetime | None

    model_config = ConfigDict(from_attributes=True)