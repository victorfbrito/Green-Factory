from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models.language import Language


class LanguageRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def replace_user_languages(self, user_id: int, languages: list[Language]) -> list[Language]:
        self.db.execute(delete(Language).where(Language.user_id == user_id))

        saved_languages: list[Language] = []

        for language in languages:
            language.user_id = user_id
            self.db.add(language)
            saved_languages.append(language)

        self.db.commit()

        for language in saved_languages:
            self.db.refresh(language)

        return saved_languages