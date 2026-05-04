from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""
    EMAIL_FROM_NAME: str = "FreightFlex"

    FCM_SERVER_KEY: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8081"

    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""

    @model_validator(mode="after")
    def populate_database_url(self) -> "Settings":
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
