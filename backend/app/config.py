from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "FreightFlex API"

    DATABASE_URL: str
    REDIS_URL: str = ""  # optional — leave blank to use in-memory fallback

    JWT_PRIVATE_KEY: str
    JWT_PUBLIC_KEY: str
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    AWS_S3_BUCKET_DOCS: str = "freightflex-docs"
    AWS_S3_BUCKET_INVOICES: str = "freightflex-invoices"

    GOOGLE_MAPS_API_KEY: str = ""

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@freightflex.io"

    FCM_SERVER_KEY: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    CELERY_BROKER_URL: str = ""  # optional — Celery disabled when blank
    CELERY_RESULT_BACKEND: str = ""

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
