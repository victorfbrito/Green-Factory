from pydantic import BaseModel, ConfigDict, Field


class DuolingoCourse(BaseModel):
    id: str
    title: str | None = None

    learningLanguage: str
    fromLanguage: str | None = None

    xp: int | None = None
    crowns: int | None = None

    model_config = ConfigDict(extra="ignore")

class DuolingoUserResponse(BaseModel):
    id: int | None = None
    username: str
    name: str | None = None
    picture: str | None = None

    streak: int | None = None
    total_xp: int | None = Field(default=None, alias="totalXp")

    courses: list[DuolingoCourse] | None = None

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
    )