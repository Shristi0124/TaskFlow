from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "mysql+pymysql://taskflow_user:taskflow_pass@localhost:3306/taskflow"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60
    frontend_origin: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
