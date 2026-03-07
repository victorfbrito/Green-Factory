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

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user