# Connecting a GitHub repo to the SDET Platform

The platform doesn't run your CI — GitHub Actions does that on its own infrastructure.
The platform's job is to **pull in the results** after each run completes, whether that
run was triggered by a push, a PR, a nightly schedule, or a manual click in the Actions tab.

## 1. Copy the reporting files into your test repo

From this project, copy these two files into your test repo (e.g. alongside your `tests/` folder):

- `runner/templates/conftest_template.py` → rename to `conftest.py`
- `runner/templates/sdet_selenium.py` → keep the name

These give your pytest suite the same `@pytest.mark.test_case("id")` marker and `driver`
fixture that local scripts use — so your test functions look identical whether they run
locally or in CI.

## 2. Add the workflow file

Copy `sdet-tests.yml` (in this same folder) into your test repo at:
```
.github/workflows/sdet-tests.yml
```

Adjust the `Copy platform reporting files` step if your test files live somewhere other
than `tests/`.

## 3. Create a GitHub Personal Access Token

The platform needs a token to *read* workflow runs and artifacts (it never writes to your repo).

1. Go to https://github.com/settings/tokens → Generate new token (classic is simplest)
2. Scopes needed: `repo` (if the repo is private) and `actions:read` (or just `repo` — it covers this)
3. Copy the token

## 4. Set the token for the platform

In this project's root, copy `.env.example` to `.env` and paste your token:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```
Restart the backend: `docker compose restart backend`

## 5. Create the pipeline in the dashboard

Go to **Pipelines → + New Pipeline** and fill in:
- **GitHub repo:** `yourname/your-repo`
- **Workflow filename:** `sdet-tests.yml`
- **Branch:** `main`

## 6. Sync

Push a commit (or trigger the workflow manually from GitHub's Actions tab), wait for it to
finish, then click **Sync now** on the pipeline's page. Results land against the linked test
cases automatically — same as a local run.

You can click **Sync now** any time; already-imported runs are skipped, so it's safe to click
repeatedly or set up a habit of checking after each push.
