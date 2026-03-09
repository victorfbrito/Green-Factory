from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_username(self, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        return self.db.scalar(statement)
        
    def get_user_with_languages(self, username: str) -> User | None:
        statement = (
            select(User)
            .options(joinedload(User.languages))
            .where(User.username == username)
        )
        return self.db.scalar(statement)

    def get_all_users_with_languages(self) -> list[User]:
        """Fetch all users with languages eager-loaded (for leaderboard)."""
        statement = select(User).options(joinedload(User.languages)).order_by(User.username)
        return list(self.db.scalars(statement).unique().all())

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user