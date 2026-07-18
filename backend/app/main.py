import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

# Serves failure screenshots captured during test runs, e.g.
# /run-artifacts/{run_id}/screenshots/{test_case_id}.png
SCRIPTS_DIR = os.getenv("SCRIPTS_DIR", "/data/scripts")
RUNS_DIR = os.path.join(SCRIPTS_DIR, "runs")
os.makedirs(RUNS_DIR, exist_ok=True)
app.mount("/run-artifacts", StaticFiles(directory=RUNS_DIR), name="run-artifacts")


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
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
        "ALTER TABLE automation_scripts ADD COLUMN IF NOT EXISTS test_suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE",
        "ALTER TABLE execution_results ADD COLUMN IF NOT EXISTS screenshot_url VARCHAR(500)",
        # Legacy scripts predate the language dropdown and used a free-text default —
        # normalize them to the new vocabulary so the Pydantic enum doesn't reject them.
        "UPDATE automation_scripts SET language = 'pytest-python' WHERE language = 'python-selenium'",
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


>>>>>>> feature/integrated_test_scripts
@app.get("/health")
def health():
    return {"status": "ok"}
