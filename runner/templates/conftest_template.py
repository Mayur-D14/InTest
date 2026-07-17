"""
Injected by the SDET Platform runner alongside every executed script.
Captures pytest outcomes and maps them back to platform test case IDs via
the @pytest.mark.test_case("<id>", ...) marker, then writes a results JSON
file that the runner agent reads after the pytest session ends.
"""
import json
import os
import pytest

RESULTS_PATH = os.environ.get("SDET_RESULTS_PATH", "/data/scripts/results.json")

_results = {}  # test_case_id -> {"outcome": ..., "detail": ...}


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "test_case(*ids): map this test function to one or more platform test case IDs"
    )


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
        # last write wins if multiple pytest functions map to the same test case
        _results[test_case_id] = {"outcome": outcome, "detail": detail}


def pytest_sessionfinish(session, exitstatus):
    os.makedirs(os.path.dirname(RESULTS_PATH), exist_ok=True)
    with open(RESULTS_PATH, "w") as f:
        json.dump(_results, f, indent=2)
