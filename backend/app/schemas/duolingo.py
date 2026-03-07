from pydantic import BaseModel, Field


class DuolingoUserResponse(BaseModel):
    id: int | None = None
    username: str
    name: str | None = None
    picture: str | None = None
    profile_country: str | None = None
    has_plus: bool | None = None

    streak: int | None = None
    longest_streak: int | None = None
    total_xp: int | None = Field(default=None, alias="totalXp")

    from_language: str | None = None
    learning_language: str | None = None

    class Config:
        populate_by_name = True