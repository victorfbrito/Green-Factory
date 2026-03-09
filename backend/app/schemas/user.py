from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LanguageResponse(BaseModel):
    id: int
    duolingo_course_id: str
    language_code: str
    language_name: str
    xp: int
    crowns: int
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str | None
    avatar_url: str | None
    timezone: str | None
    streak: int
    streak_extended_today: bool
    total_xp: int
    current_course_id: str | None
    last_synced_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class UserRefreshResponse(UserResponse):
    languages: list[LanguageResponse]


# --- Factory visualization payload (UI-oriented, derived fields) ---
# Sector tier: 0 = 0 xp, 1 = 1–499, 2 = 500–1999, 3 = 2000–9999, 4 = 10000–49999, 5 = 50000+

def _xp_to_sector_tier(xp: int) -> int:
    if xp <= 0:
        return 0
    if xp < 500:
        return 1
    if xp < 2000:
        return 2
    if xp < 10000:
        return 3
    if xp < 50000:
        return 4
    return 5


def _streak_to_band(streak: int) -> str:
    if streak <= 0:
        return "inactive"
    if streak <= 6:
        return "warming_up"
    if streak <= 29:
        return "steady"
    if streak <= 99:
        return "committed"
    if streak <= 364:
        return "legendary"
    return "mythic"


# --- Sustainability (factory world / environment state) ---

def compute_streak_score(streak: int) -> int:
    """Streak contribution to sustainability (0..55)."""
    if streak <= 0:
        return 0
    if streak <= 3:
        return 12
    if streak <= 6:
        return 18
    if streak <= 13:
        return 24
    if streak <= 29:
        return 31
    if streak <= 59:
        return 39
    if streak <= 99:
        return 46
    if streak <= 179:
        return 53
    return 55


def compute_maturity_score(total_xp: int) -> int:
    """Total XP contribution to sustainability (0..35)."""
    if total_xp <= 0:
        return 0
    if total_xp < 1000:
        return 2
    if total_xp < 3000:
        return 5
    if total_xp < 7000:
        return 8
    if total_xp < 15000:
        return 11
    if total_xp < 30000:
        return 18
    if total_xp < 50000:
        return 25
    if total_xp < 75000:
        return 30
    return 35


def compute_balance_bonus(dominant_language_xp_share: float) -> int:
    """Balance bonus for multiple languages (0..10). No languages/total_xp=0 -> 0."""
    if dominant_language_xp_share <= 0:
        return 0
    if dominant_language_xp_share > 0.95:
        return 0
    if dominant_language_xp_share >= 0.85:
        return 2
    if dominant_language_xp_share > 0.70:
        return 5
    if dominant_language_xp_share > 0.55:
        return 8
    return 10


def compute_sustainability_score(
    streak: int,
    total_xp: int,
    dominant_language_xp_share: float,
) -> int:
    """Overall sustainability score 0..100 (clamped)."""
    streak_score = compute_streak_score(streak)
    maturity_score = compute_maturity_score(total_xp)
    balance_bonus = compute_balance_bonus(dominant_language_xp_share)
    raw = streak_score + maturity_score + balance_bonus
    return max(0, min(100, raw))


def compute_environment_state(score: int) -> tuple[int, str]:
    """Map sustainability_score to (environment_level, environment_label)."""
    if score <= 19:
        return 0, "industrial"
    if score <= 39:
        return 1, "improving"
    if score <= 59:
        return 2, "sustainable"
    if score <= 79:
        return 3, "advanced_green"
    return 4, "regenerative"


def compute_unlocked_upgrades(streak: int) -> list[str]:
    """Sustainability upgrades unlocked by streak. Global, factory-wide. Order is fixed."""
    upgrades: list[str] = []
    if streak >= 7:
        upgrades.append("solar_panels")
    if streak >= 14:
        upgrades.append("water_recycling")
    if streak >= 30:
        upgrades.append("wind_turbines")
    if streak >= 60:
        upgrades.append("green_roofs")
    if streak >= 100:
        upgrades.append("electric_transport")
    if streak >= 180:
        upgrades.append("urban_trees")
    if streak >= 365:
        upgrades.append("carbon_capture")
    return upgrades


# --- Upgrade educational content (popup-friendly) ---

class UpgradeDetail(BaseModel):
    id: str
    title: str
    short_description: str
    educational_note: str


_UPGRADE_CONTENT: dict[str, UpgradeDetail] = {
    "solar_panels": UpgradeDetail(
        id="solar_panels",
        title="Solar Panels",
        short_description="Generate clean electricity on-site.",
        educational_note="Many factories use rooftop solar to reduce dependence on fossil fuels.",
    ),
    "water_recycling": UpgradeDetail(
        id="water_recycling",
        title="Water Recycling",
        short_description="Reuse industrial water more efficiently.",
        educational_note="Water recycling systems help reduce freshwater waste in industrial processes.",
    ),
    "wind_turbines": UpgradeDetail(
        id="wind_turbines",
        title="Wind Turbines",
        short_description="Add renewable power to the factory grid.",
        educational_note="Wind power helps industries lower carbon emissions while supplying electricity.",
    ),
    "green_roofs": UpgradeDetail(
        id="green_roofs",
        title="Green Roofs",
        short_description="Cool buildings and support urban biodiversity.",
        educational_note="Green roofs can reduce heat buildup and create habitat for pollinators and plants.",
    ),
    "electric_transport": UpgradeDetail(
        id="electric_transport",
        title="Electric Transport",
        short_description="Clean up factory logistics.",
        educational_note="Electric vehicles reduce local air pollution and lower fossil fuel use in transport.",
    ),
    "urban_trees": UpgradeDetail(
        id="urban_trees",
        title="Urban Trees",
        short_description="Add green buffers around the factory.",
        educational_note="Tree belts help absorb carbon, improve air quality, and reduce heat around industrial zones.",
    ),
    "carbon_capture": UpgradeDetail(
        id="carbon_capture",
        title="Carbon Capture",
        short_description="Reduce industrial CO₂ emissions.",
        educational_note="Carbon capture systems trap part of the CO₂ before it reaches the atmosphere.",
    ),
}


def build_upgrade_details(unlocked_upgrades: list[str]) -> list[UpgradeDetail]:
    """Return educational details for each unlocked upgrade, in the same order. Ignores unknown ids."""
    return [
        _UPGRADE_CONTENT[uid]
        for uid in unlocked_upgrades
        if uid in _UPGRADE_CONTENT
    ]


class FactoryLanguageResponse(BaseModel):
    course_id: str
    language_code: str
    language_name: str
    xp: int
    crowns: int
    is_current: bool
    xp_share: float
    sector_tier: int
    sort_order: int
    seed_key: str


class FactoryUserResponse(BaseModel):
    username: str
    display_name: str | None
    streak: int
    total_xp: int
    current_course_id: str | None


class FactoryMeta(BaseModel):
    total_languages: int
    primary_language_code: str | None
    active_streak_band: str
    dominant_language_xp_share: float
    sustainability_score: int
    environment_level: int
    environment_label: str
    unlocked_upgrades: list[str]
    upgrade_details: list[UpgradeDetail]


class FactoryResponse(BaseModel):
    user: FactoryUserResponse
    factory_meta: FactoryMeta
    languages: list[FactoryLanguageResponse]


# --- Leaderboard: shared derived data (reused by /factory and /factories/top) ---

class FactoryDerivedData(BaseModel):
    """Computed factory metrics for a user (no DB). Used by factory payload and leaderboard."""
    total_languages: int
    primary_language_code: str | None
    dominant_language_xp_share: float
    sustainability_score: int
    environment_level: int
    environment_label: str


def compute_factory_derived(
    streak: int,
    total_xp: int,
    languages: list,  # objects with .xp and .language_code
) -> FactoryDerivedData:
    """Pure: compute factory-derived metrics from streak, total_xp, and language list."""
    total_language_xp = sum(lang.xp for lang in languages)
    max_language_xp = max((lang.xp for lang in languages), default=0)
    dominant_language_xp_share = (
        round(max_language_xp / total_language_xp, 2) if total_language_xp else 0.0
    )
    sorted_langs = sorted(languages, key=lambda l: l.xp, reverse=True)
    primary_language_code = sorted_langs[0].language_code if sorted_langs else None
    sustainability_score = compute_sustainability_score(
        streak, total_xp, dominant_language_xp_share
    )
    environment_level, environment_label = compute_environment_state(sustainability_score)
    return FactoryDerivedData(
        total_languages=len(languages),
        primary_language_code=primary_language_code,
        dominant_language_xp_share=dominant_language_xp_share,
        sustainability_score=sustainability_score,
        environment_level=environment_level,
        environment_label=environment_label,
    )


# --- Leaderboard response ---

class TopFactoryItemResponse(BaseModel):
    username: str
    display_name: str | None
    avatar_url: str | None
    total_xp: int
    streak: int
    current_course_id: str | None
    total_languages: int
    primary_language_code: str | None
    dominant_language_xp_share: float
    sustainability_score: int
    environment_level: int
    environment_label: str


class TopFactoriesResponse(BaseModel):
    items: list[TopFactoryItemResponse]