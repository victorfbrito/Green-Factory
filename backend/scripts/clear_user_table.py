#!/usr/bin/env python3
"""Delete all rows from users table (and dependent languages + skills). Run from backend: uv run python scripts/clear_user_table.py"""

import sys
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete

from app.db.session import SessionLocal
from app.db.models import User, Language, Skill


def main() -> None:
    db = SessionLocal()
    try:
        # Delete in FK order: skills -> languages -> users
        db.execute(delete(Skill))
        db.execute(delete(Language))
        db.execute(delete(User))
        db.commit()
        print("Cleaned: users, languages, and skills tables (all rows deleted).")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
