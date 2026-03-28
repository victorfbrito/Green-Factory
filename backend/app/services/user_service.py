from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.clients.duolingo_client import DuolingoClient
from app.db.models.language import Language
from app.db.models.user import User
from app.repositories.language_repository import LanguageRepository
from app.repositories.user_repository import UserRepository
from app.compound_progression import get_compound_progress
from app.schemas.user import (
    FactoryLanguageResponse,
    FactoryMeta,
    FactoryResponse,
    FactoryUserResponse,
    LanguageResponse,
    TopFactoriesResponse,
    TopFactoryItemResponse,
    UserRefreshResponse,
    _streak_to_band,
    build_upgrade_details,
    compute_environment_state,
    compute_factory_derived,
    compute_sustainability_score,
    compute_unlocked_upgrades,
)


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.user_repository = UserRepository(db)
        self.language_repository = LanguageRepository(db)
        self.duolingo_client = DuolingoClient()

    async def get_user(self, username: str) -> UserRefreshResponse:
        user = self.user_repository.get_user_with_languages(username)
        if user is None:
            raise ValueError("User not found")
        return self._to_refresh_response(user)

    async def refresh_user(self, username: str) -> UserRefreshResponse:
        # Case-insensitive lookup so /users/izaricheto/refresh finds existing IzaRicheto
        user = self.user_repository.get_by_username_insensitive(username)
        if user is not None and user.last_synced_at is not None:
            now = datetime.now(UTC)
            if (now - user.last_synced_at) < timedelta(minutes=5):
                user_with_langs = self.user_repository.get_user_with_languages(user.username)
                if user_with_langs is not None:
                    return self._to_refresh_response(user_with_langs)

        duolingo_user = await self.duolingo_client.fetch_user_by_username(username)
        user = self.user_repository.get_by_username_insensitive(username)

        if user is None:
            user = User(
                duolingo_user_id=duolingo_user.id,
                username=duolingo_user.username,
                display_name=duolingo_user.name,
                avatar_url=duolingo_user.picture,
                timezone=duolingo_user.timezone,
                streak=duolingo_user.streak or 0,
                streak_extended_today=False,
                total_xp=duolingo_user.total_xp or 0,
                current_course_id=duolingo_user.current_course_id,
                last_synced_at=datetime.now(UTC),
            )
        else:
            user.duolingo_user_id = duolingo_user.id
            user.display_name = duolingo_user.name
            user.avatar_url = duolingo_user.picture
            user.timezone = duolingo_user.timezone
            user.streak = duolingo_user.streak or 0
            user.total_xp = duolingo_user.total_xp or 0
            user.current_course_id = duolingo_user.current_course_id
            user.last_synced_at = datetime.now(UTC)

        saved_user = self.user_repository.save(user)
        languages: list[Language] = []

        if duolingo_user.courses:
            for course in duolingo_user.courses:
                languages.append(
                    Language(
                        duolingo_course_id=course.id,
                        language_code=course.learningLanguage,
                        language_name=course.title or course.learningLanguage,
                        xp=course.xp or 0,
                        crowns=course.crowns or 0,
                    )
                )

        saved_languages = self.language_repository.replace_user_languages(
            saved_user.id,
            languages,
        )
        saved_user.languages = saved_languages
        return self._to_refresh_response(saved_user)

    def get_factory_payload(self, username: str) -> FactoryResponse:
        """Read user + languages from DB only; build UI-oriented payload with derived fields."""
        user = self.user_repository.get_user_with_languages(username)
        if user is None:
            raise ValueError("User not found")
        current_course_id = user.current_course_id or None
        total_language_xp = sum(lang.xp for lang in user.languages)
        max_language_xp = max((lang.xp for lang in user.languages), default=0)
        dominant_language_xp_share = (
            round(max_language_xp / total_language_xp, 2) if total_language_xp else 0.0
        )
        # Sort by XP descending for consistent render order; sort_order 0 = highest XP
        sorted_languages = sorted(user.languages, key=lambda l: l.xp, reverse=True)
        primary_language_code = sorted_languages[0].language_code if sorted_languages else None
        sustainability_score = compute_sustainability_score(
            user.streak,
            user.total_xp,
            dominant_language_xp_share,
        )
        environment_level, environment_label = compute_environment_state(sustainability_score)
        unlocked_upgrades_list = compute_unlocked_upgrades(user.streak)
        lang_list = []
        for idx, lang in enumerate(sorted_languages):
            progress = get_compound_progress(lang.xp)
            lang_list.append(
                FactoryLanguageResponse(
                    course_id=lang.duolingo_course_id,
                    language_code=lang.language_code,
                    language_name=lang.language_name,
                    xp=lang.xp,
                    crowns=lang.crowns,
                    is_current=lang.duolingo_course_id == current_course_id,
                    xp_share=round(lang.xp / total_language_xp, 2) if total_language_xp else 0.0,
                    sort_order=idx,
                    seed_key=f"{user.username}:{lang.duolingo_course_id}",
                    compound_count=progress.compound_count,
                    next_compound_at_xp=progress.next_compound_at_xp,
                    xp_to_next_compound=progress.xp_to_next_compound,
                    compound_progress_ratio=progress.compound_progress_ratio,
                )
            )
        return FactoryResponse(
            user=FactoryUserResponse(
                username=user.username,
                display_name=user.display_name,
                streak=user.streak,
                total_xp=user.total_xp,
                current_course_id=user.current_course_id,
            ),
            factory_meta=FactoryMeta(
                total_languages=len(sorted_languages),
                primary_language_code=primary_language_code,
                active_streak_band=_streak_to_band(user.streak),
                dominant_language_xp_share=dominant_language_xp_share,
                sustainability_score=sustainability_score,
                environment_level=environment_level,
                environment_label=environment_label,
                unlocked_upgrades=unlocked_upgrades_list,
                upgrade_details=build_upgrade_details(unlocked_upgrades_list),
            ),
            languages=lang_list,
        )

    def get_top_factories(
        self,
        limit: int = 20,
        sort: str = "total_xp",
    ) -> TopFactoriesResponse:
        """Leaderboard of factories from DB only. No Duolingo calls."""
        users = self.user_repository.get_all_users_with_languages()
        items: list[TopFactoryItemResponse] = []
        for user in users:
            derived = compute_factory_derived(user.streak, user.total_xp, user.languages)
            items.append(
                TopFactoryItemResponse(
                    username=user.username,
                    display_name=user.display_name,
                    avatar_url=user.avatar_url,
                    total_xp=user.total_xp,
                    streak=user.streak,
                    current_course_id=user.current_course_id,
                    total_languages=derived.total_languages,
                    primary_language_code=derived.primary_language_code,
                    dominant_language_xp_share=derived.dominant_language_xp_share,
                    sustainability_score=derived.sustainability_score,
                    environment_level=derived.environment_level,
                    environment_label=derived.environment_label,
                )
            )
        # Sort key: primary metric desc, then total_xp desc, then username asc
        _SORT_KEYS = {
            "total_xp": lambda i: (-i.total_xp, i.username),
            "streak": lambda i: (-i.streak, -i.total_xp, i.username),
            "sustainability": lambda i: (-i.sustainability_score, -i.total_xp, i.username),
            "languages": lambda i: (-i.total_languages, -i.total_xp, i.username),
        }
        key_fn = _SORT_KEYS.get(sort) or _SORT_KEYS["total_xp"]
        items.sort(key=key_fn)
        return TopFactoriesResponse(items=items[:limit])

    def _to_refresh_response(self, user: User) -> UserRefreshResponse:
        return UserRefreshResponse(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            timezone=user.timezone,
            streak=user.streak,
            streak_extended_today=user.streak_extended_today,
            total_xp=user.total_xp,
            current_course_id=user.current_course_id,
            last_synced_at=user.last_synced_at,
            languages=[LanguageResponse.model_validate(lang) for lang in user.languages],
        )
