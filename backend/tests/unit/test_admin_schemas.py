import pytest
from pydantic import ValidationError
from app.schemas.admin import AdminSetUserPasswordRequest


def test_admin_set_password_valid():
    body = AdminSetUserPasswordRequest(newPassword="Secret123")
    assert body.new_password == "Secret123"


def test_admin_set_password_too_short():
    with pytest.raises(ValidationError):
        AdminSetUserPasswordRequest(newPassword="Ab1")


def test_admin_set_password_no_upper():
    with pytest.raises(ValidationError):
        AdminSetUserPasswordRequest(newPassword="secret123")


def test_admin_set_password_no_digit():
    with pytest.raises(ValidationError):
        AdminSetUserPasswordRequest(newPassword="SecretPass")
