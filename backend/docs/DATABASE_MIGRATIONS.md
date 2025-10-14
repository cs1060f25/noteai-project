# Database Migrations with Alembic

This document explains how to use Alembic for database migrations in the Lecture Highlight Extractor project.

## Overview

We use [Alembic](https://alembic.sqlalchemy.org/) for managing database schema changes. Alembic tracks database versions and allows you to upgrade or downgrade your schema reliably.

## Prerequisites

- PostgreSQL running (via Docker or locally)
- Python dependencies installed (`uv sync`)
- `.env` file configured with `DATABASE_URL`

## Common Commands

### Check Current Migration Version

```bash
uv run alembic current
```

### View Migration History

```bash
uv run alembic history
```

### Run Pending Migrations (Upgrade to Latest)

```bash
uv run alembic upgrade head
```

### Downgrade to Previous Version

```bash
# Downgrade one version
uv run alembic downgrade -1

# Downgrade to specific version
uv run alembic downgrade ce9ec48516b9

# Downgrade to base (remove all migrations)
uv run alembic downgrade base
```

## Creating New Migrations

### Auto-generate Migration from Model Changes

When you modify SQLAlchemy models in `app/models/database.py`, generate a migration:

```bash
uv run alembic revision --autogenerate -m "describe your changes"
```

**Example:**
```bash
uv run alembic revision --autogenerate -m "add user email index"
```

Alembic will compare your models to the database and generate migration code automatically.

### Create Empty Migration (Manual)

For complex changes or data migrations:

```bash
uv run alembic revision -m "describe your changes"
```

Then edit the generated file in `alembic/versions/` to add your custom logic.

### Review Generated Migrations

**Always review** generated migrations before applying them:

1. Check `alembic/versions/<revision>_<description>.py`
2. Verify `upgrade()` and `downgrade()` functions
3. Test locally before pushing to production

## Migration Workflow

### Development Workflow

1. **Make model changes** in `app/models/database.py`
2. **Generate migration:**
   ```bash
   uv run alembic revision --autogenerate -m "your description"
   ```
3. **Review** the generated migration file
4. **Test the migration:**
   ```bash
   # Apply migration
   uv run alembic upgrade head

   # Test downgrade
   uv run alembic downgrade -1

   # Re-apply
   uv run alembic upgrade head
   ```
5. **Commit** both model changes and migration file to git

### Production Deployment

The application automatically runs migrations on startup when `ENVIRONMENT=production`:

```python
# In app/main.py lifespan
if settings.environment == "production":
    run_migrations()  # Runs: alembic upgrade head
```

For manual control, set `ENVIRONMENT=development` and run migrations separately:

```bash
uv run alembic upgrade head
```

## Database Configuration

### Connection String Format

```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Local Development (Docker)

```bash
# In .env file
DATABASE_URL=postgresql://lecture_user:lecture_password@127.0.0.1:5432/lecture_extractor
```

**Note:** Use `127.0.0.1` instead of `localhost` to avoid conflicts with local PostgreSQL installations.

### Production

```bash
DATABASE_URL=postgresql://prod_user:prod_pass@db.example.com:5432/lecture_extractor_prod
```

## Docker Setup

### Start PostgreSQL Container

```bash
docker-compose up -d db
```

### Run Migrations in Container

If the API container is running:

```bash
docker-compose exec api uv run alembic upgrade head
```

### Access PostgreSQL CLI

```bash
# Via docker-compose
docker-compose exec db psql -U lecture_user -d lecture_extractor

# Via docker
docker exec -it lecture-extractor-db psql -U lecture_user -d lecture_extractor
```

### Check Tables

```sql
-- List all tables
\dt

-- Check alembic version
SELECT * FROM alembic_version;

-- Describe a table
\d jobs
```

## Troubleshooting

### "role does not exist"

If you see `FATAL: role "lecture_user" does not exist`, you're connecting to the wrong PostgreSQL instance.

**Solution:**
1. Check which PostgreSQL is running: `lsof -i :5432`
2. Stop local PostgreSQL: `brew services stop postgresql`
3. Ensure Docker PostgreSQL is running: `docker-compose up -d db`
4. Use `127.0.0.1` instead of `localhost` in `DATABASE_URL`

### "relation already exists"

If tables exist but alembic_version doesn't, the database was created with `Base.metadata.create_all()`.

**Solution:**
1. Drop all tables: `docker-compose exec db psql -U lecture_user -d lecture_extractor -c "DROP TABLE IF EXISTS <table> CASCADE;"`
2. Run fresh migration: `uv run alembic upgrade head`

Or stamp the existing schema:
```bash
uv run alembic stamp head
```

### Reset Database Completely

```bash
# Stop containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker volume rm backend_postgres_data

# Restart and migrate
docker-compose up -d db
sleep 5
uv run alembic upgrade head
```

## File Structure

```
backend/
├── alembic/
│   ├── versions/
│   │   └── ce9ec48516b9_initial_migration_with_all_tables.py
│   ├── env.py           # Alembic environment config
│   ├── script.py.mako   # Migration template
│   └── README
├── alembic.ini          # Alembic configuration
├── app/
│   ├── core/
│   │   └── database.py  # Database engine + run_migrations()
│   └── models/
│       └── database.py  # SQLAlchemy models (Base.metadata)
└── .env                 # DATABASE_URL configuration
```

## Current Schema

The initial migration (`ce9ec48516b9`) creates 7 tables:

1. **jobs** - Main processing job tracking
2. **transcripts** - Whisper transcription segments
3. **silence_regions** - Detected silence in audio/video
4. **layout_analysis** - Screen/camera layout detection
5. **content_segments** - Gemini content analysis
6. **clips** - Generated highlight clips
7. **processing_logs** - Audit trail and debugging

Plus **alembic_version** for migration tracking.

## Best Practices

1. **Always review autogenerated migrations** - Alembic isn't perfect
2. **Test migrations both ways** - Upgrade and downgrade
3. **One logical change per migration** - Keep migrations focused
4. **Use descriptive names** - `add_user_email_index` not `update_schema`
5. **Never edit applied migrations** - Create a new migration instead
6. **Backup production before migrating** - Always have a rollback plan
7. **Run migrations in maintenance window** - For production databases

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Project Database Schema](../docs/database_schema.md)
