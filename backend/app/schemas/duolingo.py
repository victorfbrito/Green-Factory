from pydantic import BaseModel, ConfigDict, Field


class DuolingoUserResponse(BaseModel):
    id: int | None = None
    username: str
    name: str | None = None
    picture: str | None = None

    streak: int | None = None
    total_xp: int | None = Field(default=None, alias="totalXp")

    learning_language: str | None = None
    from_language: str | None = None

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )