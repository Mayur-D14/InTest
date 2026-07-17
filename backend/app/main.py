import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
<<<<<<< HEAD
=======
from sqlalchemy import text
>>>>>>> spreadsheet_add_data

from app.database import Base, engine, SessionLocal
from app.routers import projects, suites, testcases, scripts, bugs, pipelines, runs
from app.seed import seed_if_empty

app = FastAPI(title="SDET Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local-only tool; tighten if ever exposed
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(suites.router)
app.include_router(testcases.router)
app.include_router(scripts.router)
app.include_router(bugs.router)
app.include_router(pipelines.router)
app.include_router(runs.router)

ATTACHMENTS_DIR = os.getenv("ATTACHMENTS_DIR", "/data/attachments")
os.makedirs(ATTACHMENTS_DIR, exist_ok=True)
app.mount("/attachments", StaticFiles(directory=ATTACHMENTS_DIR), name="attachments")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
<<<<<<< HEAD
=======
    _run_lightweight_migrations()
>>>>>>> spreadsheet_add_data
    if os.getenv("SEED_ON_START", "false").lower() == "true":
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()


<<<<<<< HEAD
=======
def _run_lightweight_migrations():
    """
    create_all() only creates missing TABLES, not missing COLUMNS on existing tables.
    For a solo-dev local tool, a full migration framework (Alembic) is more ceremony than
    this needs — instead, new columns are added here idempotently so existing databases
    pick them up automatically without losing data.
    """
    statements = [
        "ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
        "ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS test_scripts TEXT DEFAULT ''",
        "ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS test_data TEXT DEFAULT ''",
        "ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS expected_result TEXT DEFAULT ''",
        "ALTER TABLE test_case_versions ADD COLUMN IF NOT EXISTS actual_result TEXT DEFAULT ''",
    ]
    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception as e:
                # SQLite (used in tests) doesn't support IF NOT EXISTS the same way and
                # already gets these columns via create_all() on a fresh file, so failures
                # here are expected/harmless in that context.
                conn.rollback()


>>>>>>> spreadsheet_add_data
@app.get("/health")
def health():
    return {"status": "ok"}
