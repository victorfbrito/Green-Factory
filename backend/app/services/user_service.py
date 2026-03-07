from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.clients.duolingo_client import DuolingoClient
from app.db.models.language import Language
from app.db.models.user import User
from app.repositories.language_repository import LanguageRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import LanguageResponse, UserRefreshResponse


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.language_repository = LanguageRepository(db)
        self.duolingo_client = DuolingoClient()

    async def get_user(self, username: str) -> UserRefreshResponse:
        user = self.user_repository.get_user_with_languages(username)

        if user is None:
            raise ValueError("User not found")

        return UserRefreshResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            timezone=user.timezone,
            streak=user.streak,
            streak_extended_today=user.streak_extended_today,
            total_xp=user.total_xp,
            last_synced_at=user.last_synced_at,
            languages=[
                LanguageResponse.model_validate(language)
                for language in user.languages
            ],
        )

    async def refresh_user(self, username: str) -> UserRefreshResponse:
        duolingo_user = await self.duolingo_client.fetch_user_profile(username)

        user = self.user_repository.get_by_username(username)

        if user is None:
            user = User(
                username=duolingo_user.username,
                display_name=duolingo_user.name,
                avatar_url=duolingo_user.picture,
                timezone=None,
                streak=duolingo_user.streak or 0,
                streak_extended_today=False,
                total_xp=duolingo_user.total_xp or 0,
                last_synced_at=datetime.now(UTC),
            )
        else:
            user.display_name = duolingo_user.name
            user.avatar_url = duolingo_user.picture
            user.streak = duolingo_user.streak or 0
            user.total_xp = duolingo_user.total_xp or 0
            user.last_synced_at = datetime.now(UTC)

        saved_user = self.user_repository.save(user)

        languages: list[Language] = []

        if duolingo_user.courses:
            for course in duolingo_user.courses:
                languages.append(
                    Language(
                        duolingo_course_id=course.id,
                        language_code=course.learningLanguage,
                        language_name=course.title or course.learningLanguage,
                        xp=course.xp or 0,
                        crowns=course.crowns or 0,
                    )
                )

        saved_languages = self.language_repository.replace_user_languages(
            saved_user.id,
            languages,
        )

        return UserRefreshResponse(
            id=saved_user.id,
            username=saved_user.username,
            display_name=saved_user.display_name,
            avatar_url=saved_user.avatar_url,
            timezone=saved_user.timezone,
            streak=saved_user.streak,
            streak_extended_today=saved_user.streak_extended_today,
            total_xp=saved_user.total_xp,
            last_synced_at=saved_user.last_synced_at,
            languages=[
                LanguageResponse.model_validate(language)
                for language in saved_languages
            ],
        )