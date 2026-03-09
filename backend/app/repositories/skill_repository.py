from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models.skill import Skill


class SkillRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def replace_user_language_skills(
        self,
        user_id: int,
        language_id: int,
        skills: list[Skill],
    ) -> list[Skill]:
        self.db.execute(
            delete(Skill).where(
                Skill.user_id == user_id,
                Skill.language_id == language_id,
            )
        )

        saved_skills: list[Skill] = []

        for skill in skills:
            skill.user_id = user_id
            skill.language_id = language_id
            self.db.add(skill)
            saved_skills.append(skill)

        self.db.commit()

        for skill in saved_skills:
            self.db.refresh(skill)

        return saved_skills