from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    duolingo_user_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True, nullable=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    streak_extended_today: Mapped[bool] = mapped_column(Boolean, default=False)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    current_course_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    languages = relationship("Language", back_populates="user")
    skills = relationship("Skill", back_populates="user")
    