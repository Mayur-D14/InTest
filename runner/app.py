import os
import shutil
import subprocess
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SDET Runner Agent")

TEMPLATES_DIR = Path(__file__).parent / "templates"
DATA_DIR = Path("/data/scripts")


class ExecuteRequest(BaseModel):
    run_id: str
    script_dir: str  # absolute path inside the shared volume, e.g. /data/scripts/runs/<run_id>
    timeout_seconds: int = 300


class ExecuteResponse(BaseModel):
    status: str  # "completed" | "error" | "timeout"
    results: dict
    logs: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/execute", response_model=ExecuteResponse)
def execute(req: ExecuteRequest):
    script_dir = Path(req.script_dir)
    if not script_dir.exists():
        return ExecuteResponse(status="error", results={}, logs=f"script_dir does not exist: {script_dir}")

    # Inject the reporting conftest and the selenium driver helper alongside the script
    shutil.copy(TEMPLATES_DIR / "conftest_template.py", script_dir / "conftest.py")
    shutil.copy(TEMPLATES_DIR / "sdet_selenium.py", script_dir / "sdet_selenium.py")

    results_path = script_dir / "results.json"
    if results_path.exists():
        results_path.unlink()

    env = os.environ.copy()
    env["SDET_RESULTS_PATH"] = str(results_path)
    env.setdefault("SELENIUM_REMOTE_URL", "http://selenium-hub:4444/wd/hub")

    try:
        proc = subprocess.run(
            ["pytest", str(script_dir), "-v", "-p", "no:cacheprovider"],
            cwd=str(script_dir),
            env=env,
            capture_output=True,
            text=True,
            timeout=req.timeout_seconds,
        )
        logs = proc.stdout + "\n" + proc.stderr
    except subprocess.TimeoutExpired as e:
        logs = (e.stdout or "") + "\n" + (e.stderr or "") + f"\n\nTIMED OUT after {req.timeout_seconds}s"
        return ExecuteResponse(status="timeout", results={}, logs=logs)

    results = {}
    if results_path.exists():
        import json
        with open(results_path) as f:
            results = json.load(f)

    status = "completed" if proc.returncode in (0, 1) else "error"  # 1 = pytest ran but some tests failed, still "completed"
    return ExecuteResponse(status=status, results=results, logs=logs)
