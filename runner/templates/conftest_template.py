"""
Injected by the SDET Platform runner alongside every executed script.
Captures pytest outcomes and maps them back to platform test case IDs via
the @pytest.mark.test_case("<id>", ...) marker, then writes a results JSON
file that the runner agent reads after the pytest session ends.

On failure, if a `driver` fixture (Selenium WebDriver) was active for the test,
a screenshot is captured into a screenshots/ folder alongside the results —
this is what powers the "view report" / "download artifacts" features in the
dashboard, and the folder itself is what gets zipped up for download.
"""
import json
import os
import pytest

RESULTS_PATH = os.environ.get("SDET_RESULTS_PATH", "/data/scripts/results.json")
SCREENSHOTS_DIR = os.path.join(os.path.dirname(RESULTS_PATH), "screenshots")

_results = {}  # test_case_id -> {"outcome": ..., "detail": ..., "screenshot": <filename or None>}


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "test_case(*ids): map this test function to one or more platform test case IDs"
    )


def _capture_screenshot(item, test_case_id: str):
    driver = item.funcargs.get("driver") if hasattr(item, "funcargs") else None
    if driver is None:
        return None
    try:
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        filename = f"{test_case_id}.png"
        driver.get_screenshot_as_file(os.path.join(SCREENSHOTS_DIR, filename))
        return filename
    except Exception:
        return None  # best-effort — a failed screenshot shouldn't fail the whole report


def pytest_runtest_makereport(item, call):
    if call.when != "call" and not (call.when == "setup" and call.excinfo is not None):
        return

    marker = item.get_closest_marker("test_case")
    if not marker:
        return

    if call.excinfo is None:
        outcome, detail = "passed", ""
    else:
        outcome, detail = "failed", str(call.excinfo.value)[:2000]

    for test_case_id in marker.args:
        screenshot = _capture_screenshot(item, test_case_id) if outcome == "failed" else None
        # last write wins if multiple pytest functions map to the same test case
        _results[test_case_id] = {"outcome": outcome, "detail": detail, "screenshot": screenshot}


def pytest_sessionfinish(session, exitstatus):
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    with open(RESULTS_PATH, "w") as f:
        json.dump(_results, f, indent=2)
