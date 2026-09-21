import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db

# Tests run against an in-memory SQLite DB instead of MySQL so they are fast
# and don't require a running database server. The application code itself
# is database-agnostic SQLAlchemy, so this is a faithful substitute.
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    client.post("/api/auth/register", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "Test@1234",
    })
    res = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Test@1234",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
