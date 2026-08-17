import pytest
from pydantic import ValidationError
from app.schemas.admin import (
    AdminSetUserPasswordRequest,
    AdminCreateUserRequest,
    AdminSendEmailOtpRequest,
    AdminConfirmEmailOtpRequest,
)


def test_admin_create_user_email_normalized():
    body = AdminCreateUserRequest(
        fullName="Test Driver",
        email="Driver@Example.COM",
        phone="+447700900000",
        password="password12",
        role="DRIVER",
        emailVerificationToken="tok_abc",
    )
    assert body.email == "driver@example.com"
    assert body.email_verification_token == "tok_abc"


def test_admin_send_otp_email_normalized():
    body = AdminSendEmailOtpRequest(email="Alex@Example.COM", fullName="Alex")
    assert body.email == "alex@example.com"
    assert body.full_name == "Alex"


def test_admin_confirm_otp_must_be_six_digits():
    with pytest.raises(ValidationError):
        AdminConfirmEmailOtpRequest(email="driver@example.com", otp="123")


def test_admin_confirm_otp_accepts_six_digits():
    body = AdminConfirmEmailOtpRequest(email="Driver@Example.COM", otp="123456")
    assert body.email == "driver@example.com"
    assert body.otp == "123456"


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


def test_admin_create_user_driver_availability():
    body = AdminCreateUserRequest(
        fullName="Test Driver",
        email="driver@example.com",
        phone="+447700900000",
        password="password12",
        role="DRIVER",
        driverAvailability="driver_only",
    )
    assert body.driver_availability == "DRIVER_ONLY"


def test_admin_create_user_invalid_availability():
    with pytest.raises(ValidationError):
        AdminCreateUserRequest(
            fullName="Test Driver",
            email="driver@example.com",
            phone="+447700900000",
            password="password12",
            role="DRIVER",
            driverAvailability="WALKING",
        )


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
