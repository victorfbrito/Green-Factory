from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.clients.duolingo_client import DuolingoClient
from app.db.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.duolingo_client = DuolingoClient()

    async def refresh_user(self, username: str) -> UserResponse:
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
        return UserResponse.model_validate(saved_user)