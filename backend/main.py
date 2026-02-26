from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from routes import (
    auth_router, students_router, fees_router,
    payments_router, attendance_router, marks_router,
    messages_router, classes_router, teachers_router,
    users_router, admins_router, settings_router, homework_router,
    schools_router
)
from config import settings
import random
import string


def _random_link_code() -> str:
    """7-char uppercase alphanumeric code (no 0/O/1/I to avoid confusion)."""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choices(chars, k=3)) + '-' + ''.join(random.choices(chars, k=3))

app = FastAPI(
    title="School Management System API",
    description="Complete school management backend with FastAPI",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS - allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router)
app.include_router(students_router)
app.include_router(fees_router)
app.include_router(payments_router)
app.include_router(attendance_router)
app.include_router(marks_router)
app.include_router(messages_router)
app.include_router(classes_router)
app.include_router(teachers_router)
app.include_router(users_router)
app.include_router(admins_router)
app.include_router(settings_router)
app.include_router(homework_router)
app.include_router(schools_router)


def _safe_add_column(conn, table: str, col_name: str, col_type: str):
    """Add column if it doesn't exist, handling both PG (IF NOT EXISTS) and fallback."""
    try:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
        conn.commit()
    except Exception:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
            conn.commit()
        except Exception:
            pass  # Column already exists


@app.on_event("startup")
async def startup_migrate():
    """Add missing columns and backfill existing rows."""
    from database import engine
    from models import Student
    from models.models import Base, Homework as _HW, School as _School, TokenBlacklist as _TB

    with engine.connect() as conn:
        # ── Create schools table (new) ─────────────────────────────────
        try:
            Base.metadata.create_all(engine, tables=[_School.__table__], checkfirst=True)
        except Exception:
            pass

        # homeworks table — use SQLAlchemy ORM to handle dialect differences
        try:
            Base.metadata.create_all(engine, tables=[_HW.__table__], checkfirst=True)
        except Exception:
            pass

        # token_blacklist table
        try:
            Base.metadata.create_all(engine, tables=[_TB.__table__], checkfirst=True)
        except Exception:
            pass

        # Cleanup expired tokens on every startup
        try:
            conn.execute(text("DELETE FROM token_blacklist WHERE expires_at < NOW()"))
            conn.commit()
        except Exception:
            pass

        # link_code on students
        _safe_add_column(conn, "students", "link_code", "VARCHAR(10)")

        # school_id on all affected tables (nullable INTEGER, no FK constraint)
        school_id_tables = [
            "users",
            "classes",
            "fee_structures",
            "fee_invoices",
            "homeworks",
            "attendance",
            "marks",
        ]
        for table in school_id_tables:
            _safe_add_column(conn, table, "school_id", "INTEGER")

        # school_id on school_settings (unique)
        _safe_add_column(conn, "school_settings", "school_id", "INTEGER")

        # admin_permissions on school_settings
        _safe_add_column(conn, "school_settings", "admin_permissions", "TEXT")

        # JazzCash payment gateway columns on school_settings
        jazzcash_cols = [
            ("jazzcash_merchant_id",   "VARCHAR(100)"),
            ("jazzcash_password",      "VARCHAR(100)"),
            ("jazzcash_integrity_salt","VARCHAR(100)"),
            ("jazzcash_is_sandbox",    "BOOLEAN DEFAULT TRUE"),
            ("jazzcash_enabled",       "BOOLEAN DEFAULT FALSE"),
            ("jazzcash_number",        "VARCHAR(20)"),
        ]
        for col_name, col_type in jazzcash_cols:
            _safe_add_column(conn, "school_settings", col_name, col_type)
    # Backfill any students missing a link_code
    db = Session(engine)
    try:
        students = db.query(Student).filter(Student.link_code == None).all()
        used = set(r[0] for r in db.query(Student.link_code).filter(Student.link_code != None).all())
        for s in students:
            code = _random_link_code()
            while code in used:
                code = _random_link_code()
            s.link_code = code
            used.add(code)
        if students:
            db.commit()
    finally:
        db.close()


@app.get("/")
async def root():
    return {
        "message": "School Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
