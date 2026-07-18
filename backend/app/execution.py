import os
import shutil
import uuid
from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from app import models, crud

RUNNER_URL = os.getenv("RUNNER_URL", "http://runner:9000")
SCRIPTS_ROOT = Path("/data/scripts")


class ExecutionError(Exception):
    pass


def _materialize_script(script: models.AutomationScript, run_dir: Path) -> None:
    """Writes the script's source (upload or git) into run_dir/script.py"""
    run_dir.mkdir(parents=True, exist_ok=True)
    target = run_dir / "script.py"

    if script.source_type == models.ScriptSourceType.UPLOAD:
        if not script.script_content:
            raise ExecutionError("Script has no content to run.")
        target.write_text(script.script_content)
        return

    if script.source_type == models.ScriptSourceType.GIT:
        if not script.git_repo_url or not script.git_path:
            raise ExecutionError("Git-sourced script is missing repo URL or file path.")
        import git  # GitPython

        clone_dir = run_dir / "_repo"
        try:
            git.Repo.clone_from(
                script.git_repo_url, clone_dir, branch=script.git_branch or "main", depth=1
            )
        except Exception as e:
            raise ExecutionError(f"Failed to clone repo: {e}")

        source_file = clone_dir / script.git_path
        if not source_file.exists():
            raise ExecutionError(f"Path '{script.git_path}' not found in repo.")
        shutil.copy(source_file, target)
        return

    raise ExecutionError(f"Unknown source_type: {script.source_type}")


def enqueue_run(db: Session, script: models.AutomationScript) -> models.ExecutionRun:
    """Creates the run row in QUEUED state. The Celery worker picks it up and calls execute_run."""
    return crud.create_run(db, script_id=script.id, source=models.RunSource.MANUAL, status=models.RunStatus.QUEUED)


def execute_run(db: Session, run_id: str) -> models.ExecutionRun:
    """
    Does the actual work for a queued run: materialize -> call runner -> persist results.
    Called by the Celery worker (app/tasks.py), so multiple runs can execute concurrently
    across worker processes instead of blocking a single request thread.
    """
    run = crud.get_run(db, run_id)
    if not run:
        raise ExecutionError(f"Run {run_id} not found.")
    script = run.script
    if not script:
        return crud.finalize_run(db, run.id, models.RunStatus.ERROR, raw_logs="", results={}, error_message="Run has no associated script.")

    run.status = models.RunStatus.RUNNING
    db.commit()

    if script.language != models.ScriptLanguage.PYTEST_PYTHON.value:
        return crud.finalize_run(
            db, run.id, models.RunStatus.ERROR, raw_logs="", results={},
            error_message=(
                f"Execution isn't supported yet for '{script.language}' scripts — only "
                f"Pytest (Python) runs today. This script is saved for reference; language "
                f"support for the others is on the roadmap."
            ),
        )

    run_dir = SCRIPTS_ROOT / "runs" / run.id

    try:
        _materialize_script(script, run_dir)
    except ExecutionError as e:
        return crud.finalize_run(db, run.id, models.RunStatus.ERROR, raw_logs="", results={}, error_message=str(e))

    try:
        resp = httpx.post(
            f"{RUNNER_URL}/execute",
            json={"run_id": run.id, "script_dir": str(run_dir), "timeout_seconds": 300},
            timeout=310,
        )
        resp.raise_for_status()
        payload = resp.json()
    except Exception as e:
        return crud.finalize_run(db, run.id, models.RunStatus.ERROR, raw_logs="", results={}, error_message=f"Runner call failed: {e}")

    if payload["status"] == "timeout":
        return crud.finalize_run(db, run.id, models.RunStatus.ERROR, raw_logs=payload["logs"], results={}, error_message="Execution timed out.")
    if payload["status"] == "error":
        return crud.finalize_run(db, run.id, models.RunStatus.ERROR, raw_logs=payload["logs"], results={}, error_message="Runner encountered an error.")

    # Only persist results for test cases actually linked to this script
    linked_ids = {tc.id for tc in script.test_cases}
    results = {}
    for tc_id, info in payload["results"].items():
        if tc_id in linked_ids:
            screenshot_url = None
            if info.get("screenshot"):
                screenshot_url = f"/run-artifacts/{run.id}/screenshots/{info['screenshot']}"
            results[tc_id] = {"outcome": info["outcome"], "detail": info.get("detail", ""), "screenshot_url": screenshot_url}

    overall = models.RunStatus.PASSED
    if any(r["outcome"] == "failed" for r in results.values()):
        overall = models.RunStatus.FAILED

    return crud.finalize_run(db, run.id, overall, raw_logs=payload["logs"], results=results)
