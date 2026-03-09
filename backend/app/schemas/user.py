from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LanguageResponse(BaseModel):
    id: int
    duolingo_course_id: str
    language_code: str
    language_name: str
    xp: int
    crowns: int
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    avatar_url: str | None
    timezone: str | None
    streak: int
    streak_extended_today: bool
    total_xp: int
    current_course_id: str | None
    last_synced_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class UserRefreshResponse(UserResponse):
    languages: list[LanguageResponse]


# --- Factory visualization payload (UI-oriented, derived fields) ---
# Sector tier: 0 = 0 xp, 1 = 1–499, 2 = 500–1999, 3 = 2000–9999, 4 = 10000–49999, 5 = 50000+

def _xp_to_sector_tier(xp: int) -> int:
    if xp <= 0:
        return 0
    if xp < 500:
        return 1
    if xp < 2000:
        return 2
    if xp < 10000:
        return 3
    if xp < 50000:
        return 4
    return 5


def _streak_to_band(streak: int) -> str:
    if streak <= 0:
        return "inactive"
    if streak <= 6:
        return "warming_up"
    if streak <= 29:
        return "steady"
    if streak <= 99:
        return "committed"
    if streak <= 364:
        return "legendary"
    return "mythic"


class FactoryLanguageResponse(BaseModel):
    course_id: str
    language_code: str
    language_name: str
    xp: int
    crowns: int
    is_current: bool
    xp_share: float
    sector_tier: int
    sort_order: int
    seed_key: str


class FactoryUserResponse(BaseModel):
    username: str
    display_name: str | None
    streak: int
    total_xp: int
    current_course_id: str | None


class FactoryMeta(BaseModel):
    total_languages: int
    primary_language_code: str | None
    active_streak_band: str
    dominant_language_xp_share: float


class FactoryResponse(BaseModel):
    user: FactoryUserResponse
    factory_meta: FactoryMeta
    languages: list[FactoryLanguageResponse]