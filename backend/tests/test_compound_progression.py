"""Unit tests for compound progression helper."""

import pytest

from app.compound_progression import get_compound_progress


def test_0_xp() -> None:
    p = get_compound_progress(0)
    assert p.compound_count == 1
    assert p.next_compound_at_xp == 25
    assert p.xp_to_next_compound == 25
    assert p.compound_progress_ratio == 0.0


def test_1_xp() -> None:
    p = get_compound_progress(1)
    assert p.compound_count == 1
    assert p.next_compound_at_xp == 25
    assert p.xp_to_next_compound == 24
    assert 0 < p.compound_progress_ratio < 1


def test_24_xp() -> None:
    p = get_compound_progress(24)
    assert p.compound_count == 1
    assert p.next_compound_at_xp == 25
    assert p.xp_to_next_compound == 1
    assert p.compound_progress_ratio > 0.9


def test_25_xp() -> None:
    p = get_compound_progress(25)
    assert p.compound_count == 2
    assert p.next_compound_at_xp == 50
    assert p.xp_to_next_compound == 25
    assert p.compound_progress_ratio == 0.0


def test_50_xp() -> None:
    p = get_compound_progress(50)
    assert p.compound_count == 3
    assert p.next_compound_at_xp == 100
    assert p.xp_to_next_compound == 50


def test_99_xp() -> None:
    p = get_compound_progress(99)
    assert p.compound_count == 3
    assert p.next_compound_at_xp == 100
    assert p.xp_to_next_compound == 1
    assert p.compound_progress_ratio > 0.9


def test_100_xp() -> None:
    p = get_compound_progress(100)
    assert p.compound_count == 4
    assert p.next_compound_at_xp == 175
    assert p.xp_to_next_compound == 75


def test_174_xp() -> None:
    p = get_compound_progress(174)
    assert p.compound_count == 4
    assert p.next_compound_at_xp == 175
    assert p.xp_to_next_compound == 1


def test_175_xp() -> None:
    p = get_compound_progress(175)
    assert p.compound_count == 5
    assert p.next_compound_at_xp == 275
    assert p.xp_to_next_compound == 100


def test_924_xp() -> None:
    p = get_compound_progress(924)
    assert p.compound_count == 9
    assert p.next_compound_at_xp == 925
    assert p.xp_to_next_compound == 1
    assert p.compound_progress_ratio > 0.9


def test_925_xp() -> None:
    p = get_compound_progress(925)
    assert p.compound_count == 10
    assert p.next_compound_at_xp == 1125  # 925 + 200
    assert p.xp_to_next_compound == 200
    assert p.compound_progress_ratio == 0.0


def test_beyond_925_xp() -> None:
    p = get_compound_progress(1124)
    assert p.compound_count == 10
    assert p.next_compound_at_xp == 1125
    assert p.xp_to_next_compound == 1

    p = get_compound_progress(1125)
    assert p.compound_count == 11
    assert p.next_compound_at_xp == 1325  # 1125 + 200
    assert p.xp_to_next_compound == 200

    p = get_compound_progress(71656)
    assert p.compound_count == 363  # 10 + (71656 - 925) // 200
    assert p.next_compound_at_xp == 71725
    assert p.xp_to_next_compound == 69
    assert 0 <= p.compound_progress_ratio <= 1


def test_negative_xp_treated_as_zero() -> None:
    p = get_compound_progress(-1)
    assert p.compound_count == 1
    assert p.next_compound_at_xp == 25
