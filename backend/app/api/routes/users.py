from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.session import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db)) -> list[dict]:
    users = db.scalars(select(User)).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "streak": user.streak,
        }
        for user in users
    ]
