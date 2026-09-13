import os
import logging

logger = logging.getLogger(__name__)

# Lazy engine — only created when actually needed, NOT on import
_engine = None
_SessionLocal = None
Base = None

def _init_db():
    """Initialize DB connection lazily. Skips gracefully if no DB is configured."""
    global _engine, _SessionLocal, Base
    if _engine is not None:
        return True
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import declarative_base, sessionmaker
        DATABASE_URL = os.getenv("DATABASE_URL", "")
        if not DATABASE_URL:
            logger.info("[ORCA] DATABASE_URL not set. PostGIS features disabled.")
            return False
        _engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        Base = declarative_base()
        logger.info("[ORCA] PostGIS database connected.")
        return True
    except Exception as e:
        logger.warning(f"[ORCA] DB initialization skipped: {e}")
        return False

def get_db():
    if not _init_db() or _SessionLocal is None:
        yield None
        return
    db = _SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_engine():
    _init_db()
    return _engine
