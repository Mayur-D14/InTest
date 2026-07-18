import io
import os
import zipfile
from pathlib import Path

from app import models

SCREENSHOTS_ROOT = Path(os.getenv("SCRIPTS_DIR", "/data/scripts"))


def build_report_text(run: models.ExecutionRun) -> str:
    lines = []
    lines.append("=" * 70)
    lines.append("SDET PLATFORM — EXECUTION REPORT")
    lines.append("=" * 70)
    lines.append(f"Run ID:        {run.id}")
    lines.append(f"Source:        {run.source}")
    if run.script:
        lines.append(f"Script:        {run.script.name} ({run.script.language})")
    if run.pipeline:
        lines.append(f"Pipeline:      {run.pipeline.name} ({run.pipeline.github_repo})")
    if run.external_run_url:
        lines.append(f"External URL:  {run.external_run_url}")
    lines.append(f"Status:        {run.status}")
    lines.append(f"Started:       {run.started_at}")
    lines.append(f"Finished:      {run.finished_at or '(not finished)'}")
    if run.error_message:
        lines.append(f"Error:         {run.error_message}")
    lines.append("")
    lines.append("-" * 70)
    lines.append(f"TEST CASE RESULTS ({len(run.results)})")
    lines.append("-" * 70)

    for r in run.results:
        title = r.test_case.current_version.title if r.test_case and r.test_case.current_version else "(unknown test case)"
        lines.append(f"\n[{r.outcome.upper() if isinstance(r.outcome, str) else r.outcome.value.upper()}] {title}")
        lines.append(f"  Test Case ID: {r.test_case_id}")
        if r.detail:
            lines.append(f"  Detail: {r.detail}")
        if r.screenshot_url:
            lines.append(f"  Screenshot: {r.screenshot_url} (included in the downloadable zip)")

    lines.append("")
    lines.append("-" * 70)
    lines.append("RAW LOGS")
    lines.append("-" * 70)
    lines.append(run.raw_logs or "(no logs captured)")
    lines.append("")

    return "\n".join(lines)


def build_report_zip(run: models.ExecutionRun) -> bytes:
    """
    Builds a downloadable zip containing:
      report.txt      — human-readable summary (see build_report_text)
      results.json     — raw structured results
      screenshots/      — any failure screenshots that were captured, if still on disk

    Built from DB records rather than assuming the original run folder still exists,
    so this works uniformly for local script runs and CI-imported pipeline runs alike.
    """
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("report.txt", build_report_text(run))

        results_json = {
            r.test_case_id: {
                "outcome": r.outcome.value if hasattr(r.outcome, "value") else r.outcome,
                "detail": r.detail,
                "screenshot_url": r.screenshot_url,
            }
            for r in run.results
        }
        import json
        zf.writestr("results.json", json.dumps(results_json, indent=2))

        for r in run.results:
            if not r.screenshot_url:
                continue
            # screenshot_url looks like /run-artifacts/{run_id}/screenshots/{file} —
            # map that back to the actual path on the shared volume.
            rel = r.screenshot_url.replace("/run-artifacts/", "", 1)
            local_path = SCREENSHOTS_ROOT / "runs" / rel
            if local_path.exists():
                zf.writestr(f"screenshots/{local_path.name}", local_path.read_bytes())

    return buf.getvalue()
