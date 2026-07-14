import io
import json
import os
import zipfile

import httpx
from sqlalchemy.orm import Session

from app import models, crud

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"
ARTIFACT_NAME = "sdet-results"  # your workflow must upload results.json under this artifact name


class GitHubSyncError(Exception):
    pass


def _headers():
    if not GITHUB_TOKEN:
        raise GitHubSyncError(
            "GITHUB_TOKEN is not set on the backend. Add it to your environment / docker-compose.yml "
            "as a Personal Access Token with 'repo' and 'actions:read' scope."
        )
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }


def _fetch_recent_runs(repo: str, workflow_file: str, branch: str, per_page: int = 15) -> list[dict]:
    url = f"{GITHUB_API}/repos/{repo}/actions/workflows/{workflow_file}/runs"
    resp = httpx.get(url, headers=_headers(), params={"branch": branch, "per_page": per_page}, timeout=30)
    if resp.status_code == 404:
        raise GitHubSyncError(f"Workflow '{workflow_file}' not found in repo '{repo}' (or branch '{branch}' has no runs).")
    resp.raise_for_status()
    return resp.json().get("workflow_runs", [])


def _fetch_results_artifact(repo: str, run_id: int) -> dict | None:
    url = f"{GITHUB_API}/repos/{repo}/actions/runs/{run_id}/artifacts"
    resp = httpx.get(url, headers=_headers(), timeout=30)
    resp.raise_for_status()
    artifacts = resp.json().get("artifacts", [])
    match = next((a for a in artifacts if a["name"] == ARTIFACT_NAME), None)
    if not match:
        return None

    download_url = f"{GITHUB_API}/repos/{repo}/actions/artifacts/{match['id']}/zip"
    dl = httpx.get(download_url, headers=_headers(), timeout=60, follow_redirects=True)
    dl.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(dl.content)) as zf:
        names = [n for n in zf.namelist() if n.endswith(".json")]
        if not names:
            return None
        with zf.open(names[0]) as f:
            return json.load(f)


def sync_pipeline(db: Session, pipeline: models.Pipeline) -> int:
    """Pulls recent workflow runs from GitHub, imports any not already stored. Returns count imported."""
    runs = _fetch_recent_runs(pipeline.github_repo, pipeline.workflow_file, pipeline.branch)
    imported = 0

    for run in runs:
        if run.get("status") != "completed":
            continue  # still running or queued on GitHub's side; skip for now

        external_id = str(run["id"])
        if crud.get_run_by_external_id(db, pipeline.id, external_id):
            continue  # already imported

        results = _fetch_results_artifact(pipeline.github_repo, run["id"]) or {}
        conclusion = run.get("conclusion")  # "success" | "failure" | "cancelled" | ...

        if not results:
            status = models.RunStatus.ERROR
        elif any(v.get("outcome") == "failed" for v in results.values()):
            status = models.RunStatus.FAILED
        elif conclusion == "success":
            status = models.RunStatus.PASSED
        else:
            status = models.RunStatus.FAILED

        execution_run = crud.create_run(
            db,
            pipeline_id=pipeline.id,
            source=models.RunSource.GITHUB_ACTIONS,
            external_run_id=external_id,
            external_run_url=run.get("html_url"),
            status=models.RunStatus.RUNNING,
        )
        crud.finalize_run(
            db, execution_run.id, status,
            raw_logs=f"Imported from GitHub Actions run #{run.get('run_number')} ({conclusion}).",
            results=results,
            error_message=None if results else "No 'sdet-results' artifact found on this run.",
        )
        imported += 1

    return imported
