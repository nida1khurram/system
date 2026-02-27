from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    JAZZCASH_MERCHANT_ID: str = ""
    JAZZCASH_PASSWORD: str = ""
    JAZZCASH_INTEGRITY_SALT: str = ""
    JAZZCASH_API_URL: str = ""

    EASYPAISA_STORE_ID: str = ""
    EASYPAISA_HASH_KEY: str = ""

    APP_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    # Comma-separated extra origins, e.g. Vercel URL: https://myapp.vercel.app
    EXTRA_ALLOWED_ORIGINS: str = "https://system-frontend-mocha.vercel.app/"

    class Config:
        env_file = ".env"

settings = Settings()
