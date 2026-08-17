import pytest
from fastapi import HTTPException

from app.services import auth as auth_svc


@pytest.fixture(autouse=True)
def clear_admin_otp_stores():
    auth_svc._admin_otp_store.clear()
    auth_svc._admin_ok_store.clear()
    yield
    auth_svc._admin_otp_store.clear()
    auth_svc._admin_ok_store.clear()


def test_confirm_rejects_wrong_otp():
    email = "otp.driver@example.com"
    auth_svc._admin_otp_store[email] = "654321"
    with pytest.raises(HTTPException) as exc:
        auth_svc.confirm_admin_create_email_otp(None, email, "000000")
    assert exc.value.status_code == 400


def test_confirm_then_consume_token_once():
    email = "otp.driver@example.com"
    auth_svc._admin_otp_store[email] = "654321"
    token = auth_svc.confirm_admin_create_email_otp(None, email, "654321")
    assert token
    with pytest.raises(HTTPException) as missing:
        auth_svc.consume_admin_email_verification(None, email, None)
    assert missing.value.status_code == 400
    auth_svc.consume_admin_email_verification(None, email, token)
    with pytest.raises(HTTPException) as reused:
        auth_svc.consume_admin_email_verification(None, email, token)
    assert reused.value.status_code == 400


def test_consume_rejects_email_mismatch():
    email = "otp.driver@example.com"
    auth_svc._admin_otp_store[email] = "111222"
    token = auth_svc.confirm_admin_create_email_otp(None, email, "111222")
    with pytest.raises(HTTPException) as exc:
        auth_svc.consume_admin_email_verification(None, "other@example.com", token)
    assert exc.value.status_code == 400
