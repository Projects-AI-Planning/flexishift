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


def test_register_phone_valid_country():
    r = RegisterRequest(
        full_name="John",
        email="j@example.com",
        phone="07911123456",
        password="Secret123",
        role="DRIVER",
        country="GB",
    )
    # The phone number should be normalized to E.164
    assert r.phone == "+447911123456"


def test_register_phone_invalid_for_country():
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(
            full_name="John",
            email="j@example.com",
            phone="+12025550143",  # US phone number
            password="Secret123",
            role="DRIVER",
            country="GB",  # UK country
        )
    assert "Phone number does not match the selected country GB" in str(exc_info.value)


def test_register_phone_invalid_format():
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(
            full_name="John",
            email="j@example.com",
            phone="12345",  # Invalid number
            password="Secret123",
            role="DRIVER",
            country="GB",
        )
    assert "Please enter a valid phone number for country GB" in str(exc_info.value)
