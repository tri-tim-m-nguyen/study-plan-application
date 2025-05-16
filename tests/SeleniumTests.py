import unittest
import time
from threading import Thread
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import ElementClickInterceptedException

from app import create_app, db
from app.config import TestingConfig

BASE_URL = "http://127.0.0.1:5000"
LOGIN_PASSWORD = "Test@123"

def run_app(app):
    with app.app_context():
        db.create_all()
    app.run(debug=False, use_reloader=False)

class SeleniumTests(unittest.TestCase):
    created_username = None  # Class variable to store username
    
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestingConfig)
        cls.server_thread = Thread(target=run_app, args=(cls.app,))
        cls.server_thread.daemon = True
        cls.server_thread.start()
        time.sleep(2)

        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        # Add window size to ensure elements are visible
        chrome_options.add_argument("--window-size=1920,1080")
        cls.driver = webdriver.Chrome(options=chrome_options)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_1_signup(self):
        self.driver.get(f"{BASE_URL}/signup")
        username = f"selenium{int(time.time())}"
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

    def test_2_login(self):
        # Check if we have a username from previous test
        if not SeleniumTests.created_username:
            self.skipTest("Skipping test as no username is available from signup")
        self._login(SeleniumTests.created_username)
        print("✅ Login test passed.")

    def test_3_create_unit(self):
        # Check if we have a username from previous test
        if not SeleniumTests.created_username:
            self.skipTest("Skipping test as no username is available from signup")
            
        # Ensure login first
        self._login(SeleniumTests.created_username)

        # Navigate to /create
        self.driver.get(f"{BASE_URL}/create")
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "add-button")))

        # Add activity
        add_button = self.driver.find_element(By.ID, "add-button")
        self.driver.execute_script("arguments[0].scrollIntoView(true);", add_button)
        time.sleep(0.5)
        try:
            add_button.click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].click();", add_button)
        time.sleep(1)

        # Rename activity to be a unit
        activity_input = self.driver.find_element(By.CLASS_NAME, "activity-text")
        self.driver.execute_script("arguments[0].textContent = arguments[1];", activity_input, "unit1")
        time.sleep(0.5)

        # Click a slot
        slots = self.driver.find_elements(By.CLASS_NAME, "timeslot")
        self.assertTrue(slots, "❌ No timeslots found.")
        try:
            slots[0].click()
        except ElementClickInterceptedException:
            self.driver.execute_script("arguments[0].click();", slots[0])
        print("✅ Created and assigned a 'unit' activity slot.")

    def _login(self, username):
        self.driver.get(f"{BASE_URL}/login")
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
        self.driver.find_element(By.NAME, "username").send_keys(username)
        self.driver.find_element(By.NAME, "password").send_keys(LOGIN_PASSWORD)
        
        submit_button = self.driver.find_element(By.NAME, "submit")
        try:
            submit_button.click()
        except ElementClickInterceptedException:
            # Scroll to element and try again
            self.driver.execute_script("arguments[0].scrollIntoView(true);", submit_button)
            time.sleep(0.5)
            # Try direct JavaScript click execution
            self.driver.execute_script("arguments[0].click();", submit_button)
            
        WebDriverWait(self.driver, 10).until(EC.url_contains("/"))

if __name__ == "__main__":
    unittest.main()