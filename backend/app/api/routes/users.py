from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User)).all())


@router.post("/{username}/refresh", response_model=UserResponse)
async def refresh_user(
    username: str,
    db: Session = Depends(get_db),
) -> UserResponse:
    service = UserService(db)

    try:
        return await service.refresh_user(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc