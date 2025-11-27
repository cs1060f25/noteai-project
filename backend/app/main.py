"""FastAPI application entrypoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes import (
    admin,
    agent_outputs,
    api_keys,
    dashboard,
    jobs,
    results,
    upload,
    users,
    videos,
    websocket,
    quiz,
)
from app.core.logging import get_logger, setup_logging
from app.core.rate_limit_config import limiter
from app.core.settings import settings
from app.services.metrics_service import update_job_metrics

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    import asyncio

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

    # start background task for updating job metrics
    async def metrics_updater():
        while True:
            await asyncio.sleep(30)  # update every 30 seconds
            try:
                await update_job_metrics()
            except Exception as e:
                logger.error("Metrics update failed", exc_info=e)

    metrics_task = asyncio.create_task(metrics_updater())
    logger.info("Job metrics updater started")

    yield

    # shutdown
    metrics_task.cancel()
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered lecture video processing pipeline",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    lifespan=lifespan,
)

# add rate limiter state to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
logger.info("Rate limiting configured with Redis backend")

# initialize prometheus metrics (must be before app starts, but after app creation)
Instrumentator().instrument(app).expose(app)
logger.info("Prometheus metrics configured at /metrics")

# CORS: in development, allow any localhost/127.0.0.1 port via regex to avoid
# updating .env when dev server picks a new port; in other envs, use explicit list
cors_kwargs = {
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins(),
        allow_origin_regex=r"^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$",
        **cors_kwargs,
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins(),
        **cors_kwargs,
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


app.include_router(videos.router, prefix=f"{settings.api_v1_prefix}/videos", tags=["Videos"])
app.include_router(upload.router, prefix=settings.api_v1_prefix, tags=["Upload"])
app.include_router(admin.router, prefix=settings.api_v1_prefix, tags=["admin"])
app.include_router(dashboard.router, prefix=settings.api_v1_prefix, tags=["dashboard"])
app.include_router(quiz.router, prefix=settings.api_v1_prefix, tags=["quiz"])
app.include_router(jobs.router, prefix=settings.api_v1_prefix, tags=["Jobs"])
app.include_router(results.router, prefix=settings.api_v1_prefix, tags=["Results"])
app.include_router(agent_outputs.router, prefix=settings.api_v1_prefix, tags=["Agent Outputs"])
app.include_router(users.router, prefix=settings.api_v1_prefix, tags=["Users"])
app.include_router(api_keys.router, prefix=settings.api_v1_prefix, tags=["User API Keys"])
app.include_router(admin.router, prefix=settings.api_v1_prefix, tags=["Admin"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
