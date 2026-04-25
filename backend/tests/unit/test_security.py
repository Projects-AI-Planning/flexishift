import pytest
from app.core.security import hash_password, verify_password, generate_token, hash_token


def test_hash_and_verify_password():
    hashed = hash_password("MySecret1")
    assert verify_password("MySecret1", hashed)
    assert not verify_password("WrongPass1", hashed)


def test_generate_token_unique():
    tokens = {generate_token() for _ in range(100)}
    assert len(tokens) == 100


def test_hash_token_deterministic():
    raw = generate_token()
    assert hash_token(raw) == hash_token(raw)


def test_hash_token_different_inputs():
    assert hash_token("abc") != hash_token("def")
