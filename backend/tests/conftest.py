import os
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_PRIVATE_KEY", "test-private-key")
os.environ.setdefault("JWT_PUBLIC_KEY", "test-public-key")
