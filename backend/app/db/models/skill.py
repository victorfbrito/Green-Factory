from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.id"), index=True)

    duolingo_level_id: Mapped[str] = mapped_column(String(100), index=True)
    duolingo_skill_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    title: Mapped[str | None] = mapped_column(Text, nullable=True)

    type: Mapped[str] = mapped_column(String(50))
    subtype: Mapped[str | None] = mapped_column(String(50), nullable=True)
    state: Mapped[str] = mapped_column(String(50))

    finished_sessions: Mapped[int] = mapped_column(Integer, default=0)
    total_sessions: Mapped[int] = mapped_column(Integer, default=0)

    absolute_node_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    position_index: Mapped[int] = mapped_column(Integer, index=True)

    section_index: Mapped[int] = mapped_column(Integer)
    unit_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    lesson_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    crown_level_index: Mapped[int | None] = mapped_column(Integer, nullable=True)

    cefr_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="skills")
    language = relationship("Language", back_populates="skills")