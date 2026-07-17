"""
FreightFlex – Application Configuration
Pydantic Settings – Single Responsibility Principle
All environment variables loaded from .env file
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator


class Settings(BaseSettings):
    """
    Central configuration class.
    All settings loaded from environment variables / .env file.
    """

    # ── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "FreightFlex API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"        # development | staging | production
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",            # React web dev
        "http://localhost:3001",            # Admin web dev
        "http://localhost:8081",            # React Native Metro
    ]

    # ── Database (MySQL 8.0) ──────────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "freightflex"
    DB_USER: str = "freightflex_user"
    DB_PASSWORD: str = "freightflex_pass"
    DB_CHARSET: str = "utf8mb4"

    # Pool settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600             # 1 hour (MySQL wait_timeout)
    DB_POOL_PRE_PING: bool = True

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset={self.DB_CHARSET}"
        )

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # ── JWT Authentication ────────────────────────────────────────────────────
    JWT_ALGORITHM: str = "RS256"
    JWT_PRIVATE_KEY: str = ""               # RS256 PEM private key
    JWT_PUBLIC_KEY: str = ""                # RS256 PEM public key
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Bcrypt ────────────────────────────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12

    # ── Azure Blob Storage ────────────────────────────────────────────────────
    AZURE_STORAGE_ACCOUNT_NAME: str = ""
    AZURE_STORAGE_ACCOUNT_KEY: str = ""
    AZURE_CONTAINER_DOCS: str = "freightflex-docs"
    AZURE_CONTAINER_PHOTOS: str = "freightflex-photos"
    AZURE_CONTAINER_INVOICES: str = "freightflex-invoices"
    AZURE_SAS_EXPIRY_SECONDS: int = 604800      # 7 days

    # ── Google Maps Platform ──────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_MAPS_BASE_URL: str = "https://maps.googleapis.com/maps/api"

    # ── Payment Gateway (Razorpay) ────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    PAYMENT_CURRENCY: str = "INR"

    # ── SendGrid (Email) ──────────────────────────────────────────────────────
    SENDGRID_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@freightflex.io"
    EMAIL_FROM_NAME: str = "FreightFlex"

    # ── Firebase Cloud Messaging (Push Notifications) ─────────────────────────
    FCM_SERVER_KEY: str = ""
    FCM_BASE_URL: str = "https://fcm.googleapis.com/fcm/send"

    # ── Celery (Background Tasks) ─────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_LOGIN: int = 10              # requests per window
    RATE_LIMIT_LOGIN_WINDOW: int = 900      # 15 minutes in seconds
    RATE_LIMIT_FORGOT_PASSWORD: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW: int = 3600   # 1 hour
    RATE_LIMIT_DEFAULT: int = 300
    RATE_LIMIT_DEFAULT_WINDOW: int = 60     # 1 minute

    # ── Email Verification ────────────────────────────────────────────────────
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24
    EMAIL_VERIFICATION_RESEND_COOLDOWN: int = 60    # seconds

    # ── Password Reset ────────────────────────────────────────────────────────
    PASSWORD_RESET_EXPIRE_HOURS: int = 24

    # ── GPS Tracking ──────────────────────────────────────────────────────────
    GPS_UPDATE_INTERVAL_SECONDS: int = 15
    GPS_TRACKING_RETENTION_DAYS: int = 90
    ETA_DELAY_ALERT_MINUTES: int = 30       # alert if delay > 30 min

    # ── Matching ──────────────────────────────────────────────────────────────
    MATCHING_RADIUS_KM: int = 100           # max supplier distance
    MATCHING_MAX_RESULTS: int = 20          # top N suppliers

    # ── File Upload ───────────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
    ]

    # ── Pagination ────────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # ── Invoice ───────────────────────────────────────────────────────────────
    GST_RATE: float = 0.18                  # 18% GST

    # ── Frontend URLs ─────────────────────────────────────────────────────────
    FRONTEND_WEB_URL: str = "http://localhost:3000"
    FRONTEND_MOBILE_DEEP_LINK: str = "freightflex://"

    # ── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"                # json | text

    # ── Sentry (Error Tracking) ───────────────────────────────────────────────
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# ── Singleton instance ────────────────────────────────────────────────────────
settings = Settings()