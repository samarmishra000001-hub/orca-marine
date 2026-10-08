import sqlite3
from fastapi import APIRouter, HTTPException
import os

from models import UserPreference

router = APIRouter()

# Use /tmp for SQLite in serverless read-only filesystems (e.g. Vercel Lambda)
if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/users.db"
else:
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "users.db")

def init_db():
    try:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_preferences (
                    session_id TEXT PRIMARY KEY,
                    role TEXT,
                    language TEXT,
                    unit_system TEXT
                )
            ''')
            conn.commit()
    except Exception as e:
        pass

init_db()

@router.post("/preferences")
async def save_preferences(pref: UserPreference):
    """Save or update user preferences in the database."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO user_preferences (session_id, role, language, unit_system)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    role=excluded.role,
                    language=excluded.language,
                    unit_system=excluded.unit_system
            ''', (pref.session_id, pref.role, pref.language, pref.unit_system))
            conn.commit()
        return {"status": "success", "message": "Preferences saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences/{session_id}")
async def get_preferences(session_id: str):
    """Retrieve user preferences by session_id."""
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role, language, unit_system FROM user_preferences WHERE session_id = ?', (session_id,))
            row = cursor.fetchone()
            if row:
                return UserPreference(
                    session_id=session_id,
                    role=row[0],
                    language=row[1],
                    unit_system=row[2]
                )
            else:
                raise HTTPException(status_code=404, detail="Preferences not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
