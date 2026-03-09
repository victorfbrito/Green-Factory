from pydantic import BaseModel, ConfigDict


class PathLevelMetadata(BaseModel):
    skillId: str | None = None
    crownLevelIndex: int | None = None
    lessonNumber: int | None = None
    unitIndex: int | None = None
    nodeState: str | None = None

    model_config = ConfigDict(extra="ignore")


class PathLevelClientData(BaseModel):
    skillId: str | None = None
    skillIds: list[str] | None = None
    teachingObjective: str | None = None
    lessonNumber: int | None = None
    sessionType: str | None = None
    cefr: dict | None = None

    model_config = ConfigDict(extra="ignore")


class DuolingoPathLevel(BaseModel):
    id: str
    state: str
    finishedSessions: int = 0
    totalSessions: int = 0
    debugName: str | None = None
    type: str
    subtype: str | None = None
    absoluteNodeIndex: int | None = None

    pathLevelMetadata: PathLevelMetadata | None = None
    pathLevelClientData: PathLevelClientData | None = None
    sourceLevel: "DuolingoPathLevel | None" = None

    model_config = ConfigDict(extra="ignore")


class DuolingoPathUnit(BaseModel):
    unitIndex: int
    levels: list[DuolingoPathLevel]

    model_config = ConfigDict(extra="ignore")


class DuolingoPathSection(BaseModel):
    index: int
    debugName: str | None = None
    units: list[DuolingoPathUnit] | None = None

    model_config = ConfigDict(extra="ignore")


class DuolingoPathResponse(BaseModel):
    pathSections: list[DuolingoPathSection] | None = None

    model_config = ConfigDict(extra="ignore")


DuolingoPathLevel.model_rebuild()