from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import OperationalError, IntegrityError

from app.config import settings
from app.database import Base, engine
from app.routers import auth, projects, tasks, dashboard

app = FastAPI(title="TaskFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def on_startup():
    # Schema management: create tables if they don't exist.
    # For a production system this would be replaced by Alembic migrations.
    # Swallow connection errors here so the test suite (which overrides get_db
    # with its own SQLite engine and never touches this MySQL engine) can still
    # boot the app without a live MySQL server present.
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError:
        pass


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------- Centralized error handling ----------
# These handlers make sure the client always gets a consistent, meaningful
# JSON error body instead of a raw stack trace or an empty connection reset.

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Invalid request data", "errors": exc.errors()},
    )


@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    # Raised when e.g. the MySQL server is unreachable
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"detail": "Database is temporarily unavailable. Please try again shortly."},
    )


@app.exception_handler(IntegrityError)
async def db_integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "This request conflicts with existing data."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."},
    )
