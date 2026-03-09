from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import FactoryResponse, UserRefreshResponse, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return list(db.scalars(select(User)).all())


@router.get("/{username}", response_model=UserRefreshResponse)
async def get_user(
    username: str,
    db: Session = Depends(get_db),
) -> UserRefreshResponse:
    service = UserService(db)
    try:
        return await service.get_user(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{username}/factory", response_model=FactoryResponse)
def get_user_factory(
    username: str,
    db: Session = Depends(get_db),
) -> FactoryResponse:
    """Return factory-ready payload (user + languages with xp_share, sector_tier). DB only, no Duolingo call."""
    service = UserService(db)
    try:
        return service.get_factory_payload(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{username}/refresh", response_model=UserRefreshResponse)
async def refresh_user(
    username: str,
    db: Session = Depends(get_db),
) -> UserRefreshResponse:
    service = UserService(db)
    try:
        return await service.refresh_user(username)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc