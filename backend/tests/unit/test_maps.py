import math
import pytest
from app.services.maps import haversine_km


def test_haversine_same_point():
    assert haversine_km(0, 0, 0, 0) == 0.0


def test_haversine_known_distance():
    # London to Paris ≈ 340 km
    dist = haversine_km(51.5074, -0.1278, 48.8566, 2.3522)
    assert 330 < dist < 360


def test_haversine_symmetry():
    a = haversine_km(20.0, 30.0, 25.0, 35.0)
    b = haversine_km(25.0, 35.0, 20.0, 30.0)
    assert math.isclose(a, b, rel_tol=1e-9)
