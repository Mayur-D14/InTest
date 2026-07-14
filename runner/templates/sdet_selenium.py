"""
Import this in your script: `from sdet_selenium import driver`
and add `driver` as a parameter to any pytest test function to get a
ready-to-use remote Selenium WebDriver connected to the platform's
Selenium Grid.

Example:

    import pytest
    from sdet_selenium import driver  # noqa: F401

    @pytest.mark.test_case("your-test-case-id-here")
    def test_homepage_loads(driver):
        driver.get("https://example.com")
        assert "Example" in driver.title
"""
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

SELENIUM_REMOTE_URL = os.environ.get("SELENIUM_REMOTE_URL", "http://selenium-hub:4444/wd/hub")


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    d = webdriver.Remote(command_executor=SELENIUM_REMOTE_URL, options=options)
    yield d
    d.quit()
