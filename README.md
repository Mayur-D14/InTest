# SDET Platform

A local-first, Docker-based platform for a solo Software Development Engineer in Test.
Built incrementally, module by module.

## Status

### Phase 1 — Test Case Management ✅
- Projects → Test Suites → Test Cases hierarchy
- Rich test case fields: title, preconditions, numbered steps, priority, severity, status, tags
- Full version history (snapshot-based) — every edit creates a new version, nothing is lost

### Phase 2 — Automation Script Runner ✅
- **Hierarchy**: Scripts now live under Project → Test Suite → Scripts, mirroring test cases —
  no more picking test cases from across every suite when creating a script
- **Language selection**: Pytest (Python), Playwright, JavaScript, C#, Java. Only Pytest actually
  executes today; the others save fine for organization with a clear "not wired up yet" notice
  instead of a confusing failure
- **Edit existing scripts** — name, description, language, source, and linked test cases are all editable after creation
- **Test case IDs are visible** next to every linked test case, on both the script panel and the
  test cases table, with a one-click copy — no more hunting for the ID to paste into `@pytest.mark.test_case(...)`
- **Reports**: every run has a **View report** (formatted text, in-browser) and **Download report (.zip)**
  button — the zip bundles a human-readable report, the raw structured results, and any failure
  screenshots that were captured
- **Screenshots on failure**: if a test uses the `driver` fixture and fails, a screenshot is
  captured automatically and shown inline next to that result
- Upload Python/pytest/Selenium scripts directly, or point at a file in a Git repo
- One script can link to multiple test cases via `@pytest.mark.test_case("id")`
- Scripts execute against a real **Selenium Grid** running in Docker
- Per-test-case pass/fail results, run history, full logs viewable per run

### Phase 3 — Bug Reports ✅
- Rich fields: severity, priority, status (Open/In Progress/Resolved/Closed/Reopened), environment, assignee
- Steps to reproduce (ordered, like test case steps)
- Screenshot/file attachments, stored on a Docker volume and served statically
- Open-ended `custom_fields` (key/value) for anything the built-in fields don't cover
- **File bug** button appears next to any failed automation result — pre-fills title, links the
  test case + run, and carries over the failure detail so you're not retyping context
- Bugs can also be filed and linked manually, independent of automation

### Phase 4 — CI/CD Pipelines (GitHub Actions) ✅
- **Pull-based integration**: since this platform is fully local, GitHub Actions (cloud-hosted)
  can't call back to your machine directly — so the platform polls the GitHub API instead
- Covers every trigger type uniformly: push, PR, scheduled (nightly), and manual `workflow_dispatch`
  all show up as "workflow runs" to the GitHub API, so one **Sync now** button handles all of them
- Your GitHub Actions workflow runs pytest with the same reporting contract as local scripts
  (same `conftest.py` / `sdet_selenium.py`) and uploads a `sdet-results` artifact
- Sync is idempotent — already-imported runs are skipped, safe to click repeatedly
- CI runs and local runs share the same `ExecutionResult` history against each test case
- Full setup guide + ready-to-copy workflow file in `ci-integration/`

### Phase 5 — Parallel Execution ✅
- Triggering a run no longer blocks — it returns immediately as `queued`, a **Celery worker**
  picks it up and executes it in the background against Redis as the message broker
- **Run all** button enqueues every script with linked test cases at once — they execute
  concurrently instead of one at a time
- Real concurrency comes from scaling: `docker compose up --scale runner=3 --scale chrome-node=3`
  gives you 3 parallel browser sessions; bump `worker`'s `--concurrency` to match
- Dashboard polls run status every 2s while anything is `queued`/`running`, no manual refresh needed

All five original modules are now built and wired together.

## Running it

Requires Docker Desktop.

```bash
cd sdet-platform
docker compose up --build
```

- Frontend dashboard: http://localhost:5173
- Backend API: http://localhost:8000
- API docs (auto-generated): http://localhost:8000/docs
- Postgres: localhost:5432 (user: `sdet`, password: `sdet_local_pw`, db: `sdet_platform`)
- Selenium Grid console: http://localhost:4444
- Bug attachments served at: http://localhost:8000/attachments/...

On first run, the backend seeds sample data automatically (`SEED_ON_START=true` in docker-compose.yml).
To disable seeding on subsequent runs, set it to `false` or just leave it — seeding only happens if the `projects` table is empty.

**First run will take a few minutes** — it's pulling Selenium Grid images and building 3 custom images (backend, frontend, runner).

## Writing an automation script

Scripts are standard pytest files. Two things make them talk to the platform:

1. **`@pytest.mark.test_case("<test-case-id>")`** on each test function — maps that test to a
   test case in the platform. You'll see each linked test case's ID in the script creation form.
2. **`from sdet_selenium import driver`** — gives you a `driver` fixture already connected to the
   Selenium Grid. No manual WebDriver setup needed.

```python
import pytest
from sdet_selenium import driver  # noqa: F401

@pytest.mark.test_case("3f9a1c2e-...")
def test_homepage_loads(driver):
    driver.get("https://example.com")
    assert "Example Domain" in driver.title
```

Click **Run now** on the script's detail page — the platform copies your script into a shared
volume, the runner service executes it with pytest against the Grid, and results flow back to
each linked test case's run history.

## Project structure

```
sdet-platform/
├── docker-compose.yml       # postgres + redis + selenium-hub + chrome-node + runner + backend + worker + frontend
├── .env.example              # GITHUB_TOKEN goes here (copy to .env)
├── ci-integration/
│   ├── sdet-tests.yml         # copy into your test repo's .github/workflows/
│   └── README.md              # step-by-step setup guide
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entrypoint
│   │   ├── database.py      # SQLAlchemy engine/session
│   │   ├── celery_app.py    # Celery configuration (Redis broker/backend)
│   │   ├── tasks.py         # Celery task wrapping execution logic
│   │   ├── models.py        # Project, TestSuite, TestCase, TestCaseVersion, TestCaseStep,
│   │   │                     # AutomationScript, Pipeline, ExecutionRun, ExecutionResult,
│   │   │                     # Bug, BugStep, BugAttachment
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── crud.py          # DB operations, including versioning + script/run + bug + pipeline logic
│   │   ├── execution.py     # enqueue_run (creates QUEUED row) + execute_run (does the work)
│   │   ├── github_integration.py  # polls GitHub Actions API, imports run results
│   │   ├── seed.py          # sample data seeder
│   │   └── routers/         # projects.py, suites.py, testcases.py, scripts.py, bugs.py, pipelines.py, runs.py
│   └── requirements.txt
├── runner/
│   ├── app.py                # FastAPI agent: receives /execute requests, runs pytest, returns results
│   ├── templates/
│   │   ├── conftest_template.py   # captures per-test-case pass/fail via pytest hooks
│   │   └── sdet_selenium.py       # the `driver` fixture, connects to Selenium Grid
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx           # shell + sidebar nav + routes
    │   ├── pages/             # Projects, Suites, TestCases, TestCaseDetail,
    │   │                       # Scripts, ScriptDetail, Bugs, BugDetail, Pipelines, PipelineDetail
    │   ├── components/        # TestCaseForm, BugForm, Badges
    │   └── lib/api.ts         # typed API client
    └── package.json
```

## Architecture notes

- **Schema changes auto-migrate on startup.** New columns (flat test case fields, the script→suite
  hierarchy, failure screenshot URLs) are added to your existing Postgres database automatically via
  idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements run at backend startup — no manual
  SQL, no data loss. Existing scripts also get their `language` value normalized from the old free-text
  default to the new dropdown vocabulary automatically.
- **"Test Title" stays a required first column** even though it wasn't explicitly re-listed in the
  most recent format spec — every test case needs an identifying title, so this was kept as an
  assumption rather than dropped. Flag it if that's not what you meant.
- **Versioning is snapshot-based**, not diff-based: every edit to a test case creates a brand-new
  `TestCaseVersion` row with a full copy of all fields + steps. `TestCase.current_version_id` always
  points at the latest one.
- **No Docker-in-Docker.** The backend never spins up containers directly — it writes scripts to a
  shared named volume (`scripts_data`) and calls the always-on `runner` service over HTTP. This keeps
  the setup simple on Docker Desktop and means Phase 5 (parallel execution) can just add more runner
  replicas behind a queue without redesigning anything.
- **Result contract:** a `conftest.py` is injected alongside every script at run time. It hooks
  `pytest_runtest_makereport` to capture pass/fail per test function, cross-references the
  `test_case` marker, and writes a `results.json` the runner reads back after the pytest session ends.

## Scaling for real parallelism

By default, Compose starts one `runner`, one `chrome-node`, and a `worker` with `--concurrency=2`.
To actually run things in parallel:

```bash
docker compose up --build --scale runner=3 --scale chrome-node=3
```

Keep `worker`'s Celery `--concurrency` (in `docker-compose.yml`) roughly matched to the number of
`chrome-node` replicas — no point queuing more concurrent browser sessions than you have nodes to
run them on. Docker's built-in DNS round-robins requests to `runner` and `selenium-hub` distributes
sessions across `chrome-node` replicas automatically — no load balancer to configure.

## Ideas for later (not built)

- Cross-language automation support (Playwright, JS/TS test runners)
- A real-time run log stream instead of polling (WebSocket or SSE)
- Slack/email notifications on pipeline failures
- Role-based access if this ever grows beyond a solo tool
