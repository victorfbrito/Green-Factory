from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import TopFactoriesResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/factories", tags=["factories"])

VALID_SORT = frozenset({"total_xp", "streak", "sustainability", "languages"})


@router.get("/top", response_model=TopFactoriesResponse)
def get_top_factories(
    limit: int = Query(default=20, ge=1, le=100, description="Max number of items to return"),
    sort: str = Query(default="total_xp", description="Sort by: total_xp, streak, sustainability, languages"),
    db: Session = Depends(get_db),
) -> TopFactoriesResponse:
    """Leaderboard of top factories from stored users only. No Duolingo calls."""
    if sort not in VALID_SORT:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort: {sort}. Must be one of: {', '.join(sorted(VALID_SORT))}",
        )
    service = UserService(db)
    return service.get_top_factories(limit=limit, sort=sort)
