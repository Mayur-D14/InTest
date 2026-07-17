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


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    if os.getenv("SEED_ON_START", "false").lower() == "true":
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
