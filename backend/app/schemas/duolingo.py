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
    """Parsed from GET /2017-06-30/users?username={username} (public)."""
    id: int | None = None
    username: str
    name: str | None = None
    picture: str | None = None
    timezone: str | None = None
    streak: int | None = None
    total_xp: int | None = Field(default=None, alias="totalXp")
    current_course_id: str | None = Field(default=None, alias="currentCourseId")
    courses: list[DuolingoCourse] | None = None
    learning_language: str | None = Field(default=None, alias="learningLanguage")
    from_language: str | None = Field(default=None, alias="fromLanguage")
    model_config = ConfigDict(populate_by_name=True, extra="ignore")