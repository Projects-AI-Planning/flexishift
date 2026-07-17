from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_NAME: str = "FreightFlex API"

    DATABASE_URL: str | None = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "freightflex"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_CHARSET: str = "utf8mb4"

    REDIS_URL: str = ""

    JWT_ALGORITHM: str = "HS256"
    JWT_SECRET_KEY: str = "dev-secret-change-me"
    JWT_PRIVATE_KEY: str = ""
    JWT_PUBLIC_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    AZURE_STORAGE_ACCOUNT_NAME: str = ""
    AZURE_STORAGE_ACCOUNT_KEY: str = ""
    AZURE_CONTAINER_DOCS: str = "freightflex-docs"
    AZURE_CONTAINER_INVOICES: str = "freightflex-invoices"

    GOOGLE_MAPS_API_KEY: str = ""

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    STRIPE_SECRET_KEY: str = "sk_test_51TYMGaFw6TQ1e6pVXu4GYfVIfOMxnHG22yL6nk0iD9uMNt3hZTqOSch69Pg0u7piUGmzFhMe3lMxuZgJoGUjnkdC006ygnWsPv"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_51TYMGaFw6TQ1e6pVSB6FoLBNIZLH0BfUU22kxyhJoi0RrNQrrIZSZJwDOaryWfIOhqVQTR54unroLb6XQhICMpJG001DchYHXN"
    STRIPE_WEBHOOK_SECRET: str = ""

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@freightflex.io"
    EMAIL_FROM: str = ""

    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "FreightFlex"

    FCM_SERVER_KEY: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8081,https://freightflex.vercel.app"

    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @model_validator(mode="after")
    def populate_database_url(self) -> "Settings":
        if self.EMAIL_FROM and self.SENDGRID_FROM_EMAIL == "noreply@freightflex.io":
            self.SENDGRID_FROM_EMAIL = self.EMAIL_FROM
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
                f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
                f"?charset={self.DB_CHARSET}"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
