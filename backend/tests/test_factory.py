"""Tests for /users/{username}/factory endpoint and factory payload."""

from unittest.mock import MagicMock, patch

from app.db.models.language import Language
from app.db.models.user import User
from app.schemas.user import FactoryResponse
from app.services.user_service import UserService


def test_factory_example_contract_valid() -> None:
    """Validate factory_example_1.json matches FactoryResponse schema."""
    import json
    from pathlib import Path

    path = Path(__file__).parent.parent / "contracts" / "factory_example_1.json"
    data = json.loads(path.read_text())
    parsed = FactoryResponse.model_validate(data)
    assert parsed.user.username == "virtofb"
    assert len(parsed.languages) == 2
    # New compound fields present, sector_tier removed from schema
    for lang in parsed.languages:
        assert hasattr(lang, "compound_count")
        assert hasattr(lang, "next_compound_at_xp")
        assert hasattr(lang, "xp_to_next_compound")
        assert hasattr(lang, "compound_progress_ratio")
    # Example values (200 XP per compound beyond 10)
    fr = next(l for l in parsed.languages if l.language_code == "fr")
    assert fr.compound_count == 363
    assert fr.next_compound_at_xp == 71725
    assert fr.xp_to_next_compound == 69
    assert fr.compound_progress_ratio == 0.655


def test_get_factory_payload_includes_compound_progression() -> None:
    """Service builds factory payload with compound_count and no sector_tier."""
    db = MagicMock()
    user = User(
        id=1,
        duolingo_user_id=123,
        username="testuser",
        display_name="Test",
        avatar_url=None,
        timezone=None,
        streak=10,
        streak_extended_today=False,
        total_xp=1000,
        current_course_id="DUOLINGO_FR_EN",
        last_synced_at=None,
    )
    lang_fr = Language(
        id=1,
        user_id=1,
        duolingo_course_id="DUOLINGO_FR_EN",
        language_code="fr",
        language_name="French",
        xp=100,
        crowns=0,
    )
    lang_de = Language(
        id=2,
        user_id=1,
        duolingo_course_id="DUOLINGO_DE_EN",
        language_code="de",
        language_name="German",
        xp=25,
        crowns=0,
    )
    user.languages = [lang_fr, lang_de]

    with patch.object(UserService, "__init__", lambda self, db: None):
        service = UserService(db)
        service.user_repository = MagicMock(get_user_with_languages=lambda u: user)
        service.language_repository = MagicMock()

        payload = service.get_factory_payload("testuser")

    assert payload.user.username == "testuser"
    assert len(payload.languages) == 2
    # French 100 XP -> 4 compounds (threshold 100)
    fr = next(l for l in payload.languages if l.language_code == "fr")
    assert fr.compound_count == 4
    assert fr.next_compound_at_xp == 175
    assert fr.xp_to_next_compound == 75
    assert 0 <= fr.compound_progress_ratio <= 1
    # German 25 XP -> 2 compounds
    de = next(l for l in payload.languages if l.language_code == "de")
    assert de.compound_count == 2
    assert de.next_compound_at_xp == 50
    assert de.xp_to_next_compound == 25
