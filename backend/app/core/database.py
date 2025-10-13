"""Database engine and session management."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings

# create engine
engine = create_engine(
    settings.database_url,
    echo=settings.db_echo,
    pool_pre_ping=True,  # verify connections before using
    pool_recycle=3600,  # recycle connections after 1 hour
)

# create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Get database session.

    Yields:
        Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database by creating all tables.

    Note: In production, use Alembic migrations instead:
        alembic upgrade head

    This method is kept for development convenience but should not be used
    in production as it doesn't handle schema migrations properly.
    """
    from app.models.database import Base

    Base.metadata.create_all(bind=engine)


def run_migrations() -> None:
    """Run Alembic migrations programmatically.

    This function runs pending database migrations using Alembic.
    Use this in production instead of init_db().
    """
    from alembic import command
    from alembic.config import Config

    # get alembic config
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    # run migrations
    command.upgrade(alembic_cfg, "head")
