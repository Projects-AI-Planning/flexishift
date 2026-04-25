import pytest
from pydantic import ValidationError
from app.schemas.auth import RegisterRequest


def test_register_valid():
    r = RegisterRequest(full_name="John", email="j@example.com", phone="09000000000", password="Secret123", role="DRIVER")
    assert r.role == "DRIVER"


def test_register_weak_password_short():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="John", email="j@example.com", phone="09000000000", password="abc", role="DRIVER")


def test_register_weak_password_no_upper():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="John", email="j@example.com", phone="09000000000", password="secret123", role="DRIVER")


def test_register_weak_password_no_digit():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="John", email="j@example.com", phone="09000000000", password="SecretPass", role="DRIVER")


def test_register_invalid_role():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="John", email="j@example.com", phone="09000000000", password="Secret123", role="SUPERUSER")


def test_register_invalid_email():
    with pytest.raises(ValidationError):
        RegisterRequest(full_name="John", email="not-an-email", phone="09000000000", password="Secret123", role="DRIVER")
