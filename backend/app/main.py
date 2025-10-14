"""FastAPI application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import jobs, results, upload, videos
from app.core.logging import get_logger, setup_logging
from app.core.settings import settings

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # startup
    logger.info(
        "Starting application",
        extra={
            "app_name": settings.app_name,
            "version": settings.app_version,
            "environment": settings.environment,
        },
    )

    # initialize database
    # in production, use alembic migrations; in dev, use create_all for convenience
    if settings.environment == "production":
        from app.core.database import run_migrations

        logger.info("Running database migrations...")
        try:
            run_migrations()
            logger.info("Database migrations completed successfully")
        except Exception as e:
            logger.error("Failed to run migrations", exc_info=e)
            raise
    else:
        from app.core.database import init_db

        logger.info("Initializing database (development mode)...")
        init_db()
        logger.info("Database initialized successfully")

    # initialize prometheus metrics
    Instrumentator().instrument(app).expose(app)
    logger.info("Prometheus metrics initialized at /metrics")

    yield

    # shutdown
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered lecture video processing pipeline",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Health check endpoint.

    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root endpoint.

    Returns:
        Welcome message
    """
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs" if settings.is_development else "disabled",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception) -> JSONResponse:
    """Global exception handler.

    Args:
        request: The request that caused the exception
        exc: The exception that was raised

    Returns:
        JSON error response
    """
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        extra={
            "path": str(request.url),
            "method": request.method,
        },
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred" if settings.is_production else str(exc),
            }
        },
    )


app.include_router(
    videos.router, prefix=f"{settings.api_v1_prefix}/videos", tags=["Videos"])
app.include_router(
    upload.router, prefix=settings.api_v1_prefix, tags=["Upload"])
app.include_router(
    jobs.router, prefix=settings.api_v1_prefix, tags=["Jobs"])
app.include_router(
    results.router, prefix=settings.api_v1_prefix, tags=["Results"])
