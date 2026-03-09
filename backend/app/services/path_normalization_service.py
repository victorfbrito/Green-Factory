from app.db.models.skill import Skill


class PathNormalizationService:
    def normalize_current_course_to_skills(self, current_course: dict) -> list[Skill]:
        normalized: list[Skill] = []
        fallback_position = 0

        sections = current_course.get("pathSectioned") or current_course.get("sections") or []

        for section in sections:
            section_index = section.get("index", 0)

            for unit in section.get("units", []):
                unit_index = unit.get("unitIndex")

                for level in unit.get("levels", []):
                    metadata = level.get("pathLevelMetadata") or {}
                    client_data = level.get("pathLevelClientData") or {}
                    source_level = level.get("sourceLevel") or {}
                    source_metadata = source_level.get("pathLevelMetadata") or {}
                    source_client_data = source_level.get("pathLevelClientData") or {}

                    duolingo_skill_id = (
                        metadata.get("skillId")
                        or client_data.get("skillId")
                        or source_metadata.get("skillId")
                        or source_client_data.get("skillId")
                    )

                    title = (
                        client_data.get("teachingObjective")
                        or source_client_data.get("teachingObjective")
                        or level.get("debugName")
                    )

                    lesson_number = (
                        metadata.get("lessonNumber")
                        or client_data.get("lessonNumber")
                        or source_metadata.get("lessonNumber")
                        or source_client_data.get("lessonNumber")
                    )

                    crown_level_index = (
                        metadata.get("crownLevelIndex")
                        or source_metadata.get("crownLevelIndex")
                    )

                    cefr_level = None
                    cefr = client_data.get("cefr") or source_client_data.get("cefr")
                    if isinstance(cefr, dict):
                        cefr_level = cefr.get("level")

                    absolute_node_index = level.get("absoluteNodeIndex")
                    position_index = (
                        absolute_node_index
                        if absolute_node_index is not None
                        else fallback_position
                    )

                    normalized.append(
                        Skill(
                            duolingo_level_id=level["id"],
                            duolingo_skill_id=duolingo_skill_id,
                            title=title,
                            type=level.get("type", "unknown"),
                            subtype=level.get("subtype"),
                            state=level.get("state", "unknown"),
                            finished_sessions=level.get("finishedSessions", 0),
                            total_sessions=level.get("totalSessions", 0),
                            absolute_node_index=absolute_node_index,
                            position_index=position_index,
                            section_index=section_index,
                            unit_index=unit_index,
                            lesson_number=lesson_number,
                            crown_level_index=crown_level_index,
                            cefr_level=cefr_level,
                        )
                    )

                    fallback_position += 1

        return normalized