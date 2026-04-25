"""
FreightFlex – Database Configuration
SQLAlchemy 2.0 + MySQL 8.0
Single Responsibility – only handles DB connection and session management
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


# ── SQLAlchemy Engine ─────────────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    pool_recycle=settings.DB_POOL_RECYCLE,
    echo=settings.DEBUG,                    # Log SQL in debug mode
    connect_args={
        "charset": "utf8mb4",
    },
)


# ── Session Factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── Declarative Base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All models must inherit from this class.
    """
    pass


# ── Dependency Injection ──────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.
    Ensures session is always closed after request.

    Usage:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error("database_session_error", error=str(e))
        db.rollback()
        raise
    finally:
        db.close()


# ── Database Health Check ─────────────────────────────────────────────────────
def check_db_connection() -> bool:
    """
    Checks if the database connection is healthy.
    Used in health check endpoint and startup event.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        logger.info("database_connection_healthy")
        return True
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        return False