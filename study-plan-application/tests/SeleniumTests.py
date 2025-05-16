import unittest
import time
from threading import Thread
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import ElementClickInterceptedException

from app import create_app, db
from app.config import TestingConfig

# Base URL of the Flask test server
BASE_URL = "http://127.0.0.1:5000"
LOGIN_PASSWORD = "Test@123"

# Function to run the Flask app in a separate thread for testing
def run_app(app):
    with app.app_context():
        db.create_all()
    app.run(debug=False, use_reloader=False)

class SeleniumTests(unittest.TestCase):
    created_username = None  # Class variable to store username
    
    @classmethod
    def setUpClass(cls):
        # Set up the Flask test app and run it in a separate thread
        cls.app = create_app(TestingConfig)
        cls.server_thread = Thread(target=run_app, args=(cls.app,))
        cls.server_thread.daemon = True
        cls.server_thread.start()
        time.sleep(2)

        # Set Chrome options for headless browser
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        # Add window size to ensure elements are visible
        chrome_options.add_argument("--window-size=1920,1080")
        cls.driver = webdriver.Chrome(options=chrome_options)

    @classmethod
    def tearDownClass(cls):
        # Close the browser and drop the database after all tests
        cls.driver.quit()
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_1_signup(self):
        # Test the signup process with a unique username
        self.driver.get(f"{BASE_URL}/signup")
        username = f"selenium{int(time.time())}"

        # Wait for the signup form to load and fill it out
        WebDriverWait(self.driver, 5).until(EC.presence_of_element_located((By.NAME, "username")))
        self.driver.find_element(By.NAME, "username").send_keys(username)
        self.driver.find_element(By.NAME, "password").send_keys(LOGIN_PASSWORD)
        self.driver.find_element(By.NAME, "confirm_password").send_keys(LOGIN_PASSWORD)
        
        # Try to click the submit button with JavaScript if regular click fails
        submit_button = self.driver.find_element(By.NAME, "submit")
        try:
            submit_button.click()
        except ElementClickInterceptedException:
            # Scroll to element and try again
            self.driver.execute_script("arguments[0].scrollIntoView(true);", submit_button)
            time.sleep(0.5)
            # Try direct JavaScript click execution
            self.driver.execute_script("arguments[0].click();", submit_button)
        
        WebDriverWait(self.driver, 5).until(EC.url_contains("/"))
        # Set the username as a class variable so other tests can access it
        SeleniumTests.created_username = username  
        print("✅ Signup test passed.")

    def test_2_logout(self):
        # Skip if we never signed up/logged in
        if not SeleniumTests.created_username:
            self.skipTest("No user in session to log out")

        # 1) Ensure we're on some page where "Logout" appears
        #    If not, log in first
        try:
            logout_link = self.driver.find_element(By.LINK_TEXT, "Logout")
        except:
            # not logged in yet, so log in
            self._login(SeleniumTests.created_username)
            WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.LINK_TEXT, "Logout"))
            )
            logout_link = self.driver.find_element(By.LINK_TEXT, "Logout")

        # 2) Click Logout
        logout_link.click()

        # 3) Wait for redirect to index page
        WebDriverWait(self.driver, 10).until(
            EC.url_contains("/index"),
            message="❌ Did not get redirected to /login after logout"
        )

        print("✅ Logout redirected to index and cleared session.")

        # 4) Try accessing a protected page (/create) to confirm session gone
        self.driver.get(f"{BASE_URL}/assessments")
        WebDriverWait(self.driver, 10).until(
            EC.url_contains("/login"),
            message="❌ Accessing /create did not redirect to login when logged out"
        )
        print("✅ Protected page /create correctly redirected to /login when not in session.")

    def test_3_login(self):
        # Check if we have a username from previous test
        if not SeleniumTests.created_username:
            self.skipTest("Skipping test as no username is available from signup")
        self._login(SeleniumTests.created_username)
        print("✅ Login test passed.")

    def test_4_create_unit(self):
        # Require signup from earlier tests
        if not SeleniumTests.created_username:
            self.skipTest("No user available from signup")

        # 0) Always log in, to guarantee a fresh session
        self._login(SeleniumTests.created_username)

        # 1) Go to /create
        self.driver.get(f"{BASE_URL}/create")

        # If we got bounced to /login, log in again and retry
        if "/login" in self.driver.current_url:
            self._login(SeleniumTests.created_username)
            self.driver.get(f"{BASE_URL}/create")

        # 2) Wait for the add-button to appear
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "add-button")),
            message="❌ add-button never appeared on /create"
        )

        # 3) Add the new activity
        add_button = self.driver.find_element(By.ID, "add-button")
        self.driver.execute_script("arguments[0].scrollIntoView(true);", add_button)
        time.sleep(0.3)
        try:
            add_button.click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].click();", add_button)
        time.sleep(0.7)

        # 4) Rename it to "unit1"
        activity_input = self.driver.find_element(By.CLASS_NAME, "activity-text")
        self.driver.execute_script(
            "arguments[0].textContent = arguments[1];",
            activity_input, "unit1"
        )
        time.sleep(0.2)

        # 5) Switch its type to unit
        type_sel = Select(self.driver.find_element(
            By.CSS_SELECTOR, ".activity-box select.form-select"
        ))
        type_sel.select_by_value("unit")
        self.assertEqual(type_sel.first_selected_option.get_attribute("value"),
                         "unit", "Failed to mark activity as unit")
        time.sleep(0.2)

        # 6) Click one timeslot
        slots = self.driver.find_elements(By.CLASS_NAME, "timeslot")
        self.assertTrue(slots, "❌ No timeslots on the timetable")
        try:
            slots[0].click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].click();", slots[0])
        print("✅ unit1 assigned at least one timeslot")

        # 7) Save timetable
        save_btn = self.driver.find_element(By.ID, "save-timetable")
        self.driver.execute_script("arguments[0].scrollIntoView(true);", save_btn)
        time.sleep(0.2)
        save_btn.click()

        # 8) Alert check
        WebDriverWait(self.driver, 5).until(EC.alert_is_present())
        alert = self.driver.switch_to.alert
        self.assertIn("Timetable saved successfully", alert.text)
        alert.accept()

        # 9) Reload and verify
        self.driver.refresh()
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((
                By.XPATH,
                "//*[contains(@class,'activity-text') and normalize-space(text())='unit1']"
            )),
            message="❌ unit1 not found after reload"
        )
        print("✅ Reload confirmed unit1 persisted")
    
    def test_5_create_assessment(self):
        # Require signup, login, and at least one unit from earlier tests
        if not SeleniumTests.created_username:
            self.skipTest("No user session available")

        # 1) Go to /assessments
        self.driver.get(f"{BASE_URL}/assessments")
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "UnitSelect"))
        )

        # 2) Pick our 'unit1' from the dropdown
        unit_select = Select(self.driver.find_element(By.ID, "UnitSelect"))
        unit_select.select_by_visible_text("unit1")
        self.assertEqual(unit_select.first_selected_option.text, "unit1")

        # 3) Fill in the assessment form
        name_in = self.driver.find_element(By.ID, "assessmentName")
        obtained_in = self.driver.find_element(By.ID, "assessmentScoreObtained")
        total_in = self.driver.find_element(By.ID, "assessmentScoreTotal")
        weight_in = self.driver.find_element(By.ID, "assessmentWeightage")

        name_in.clear()
        name_in.send_keys("Assessment1")
        obtained_in.clear()
        obtained_in.send_keys("85")
        total_in.clear()
        total_in.send_keys("100")
        weight_in.clear()
        weight_in.send_keys("20")

        # 4) Click “Save Assessment”
        save_btn = self.driver.find_element(By.CSS_SELECTOR, "button.add-btn")
        save_btn.click()

        # 5) Handle and verify the JS alert
        WebDriverWait(self.driver, 5).until(EC.alert_is_present())
        alert = self.driver.switch_to.alert
        alert_text = alert.text
        alert.accept()
        self.assertIn("Assessment saved successfully", alert_text)

        # 6) Wait for the new assessment row to appear in the summary table
        #    We look for a row with class 'assessment-row' containing "Assessment1"
        row_xpath = "//tr[contains(@class,'assessment-row') and .//td[contains(text(),'Assessment1')]]"
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.XPATH, row_xpath)),
            message="❌ New assessment 'Assessment1' did not appear in the summary"
        )
        print("✅ Successfully created and listed Assessment1 for unit1.")

    def _login(self, username):
        # Always kick off any existing session
        self.driver.get(f"{BASE_URL}/logout")
        # Now go to login
        self.driver.get(f"{BASE_URL}/login")
        # Wait for the login form
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.NAME, "username")),
            message="Login form never appeared"
        )
        # Fill and submit
        self.driver.find_element(By.NAME, "username").send_keys(username)
        self.driver.find_element(By.NAME, "password").send_keys(LOGIN_PASSWORD)
        submit_button = self.driver.find_element(By.NAME, "submit")
        try:
            submit_button.click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].scrollIntoView(true);", submit_button)
            time.sleep(0.5)
            self.driver.execute_script("arguments[0].click();", submit_button)
        # Confirm we landed away from /login
        WebDriverWait(self.driver, 10).until(
            EC.url_matches(f".*{BASE_URL}/(index|create|assessments).*"),
            message="Did not leave /login after submit"
        )

if __name__ == "__main__":
    unittest.main()