import unittest
import time
from threading import Thread
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from app import create_app, db
from app.config import TestingConfig

BASE_URL = "http://127.0.0.1:5000"
LOGIN_PASSWORD = "Test@123"

def run_app(app):
    with app.app_context():
        db.create_all()
    app.run(debug=False, use_reloader=False)

class SeleniumTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(TestingConfig)
        cls.server_thread = Thread(target=run_app, args=(cls.app,))
        cls.server_thread.daemon = True
        cls.server_thread.start()
        time.sleep(2)

        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
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
        self.driver.find_element(By.NAME, "submit").click()
        WebDriverWait(self.driver, 5).until(EC.url_contains("/"))
        self.__class__.created_username = username
        print("✅ Signup test passed.")

    def test_2_login(self):
        self._login(self.created_username)
        print("✅ Login test passed.")

    def test_3_create_unit(self):
        # Ensure login first
        self._login(self.created_username)

        # Navigate to /create
        self.driver.get(f"{BASE_URL}/create")
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.ID, "add-button")))

        # Add activity
        self.driver.find_element(By.ID, "add-button").click()
        time.sleep(1)

        # Rename activity to be a unit
        activity_input = self.driver.find_element(By.CLASS_NAME, "activity-text")
        self.driver.execute_script("arguments[0].textContent = arguments[1];", activity_input, "unit1")
        time.sleep(0.5)

        # Click a slot
        slots = self.driver.find_elements(By.CLASS_NAME, "timeslot")
        self.assertTrue(slots, "❌ No timeslots found.")
        slots[0].click()
        print("✅ Created and assigned a 'unit' activity slot.")

        

    def _login(self, username):
        self.driver.get(f"{BASE_URL}/login")
        WebDriverWait(self.driver, 10).until(EC.presence_of_element_located((By.NAME, "username")))
        self.driver.find_element(By.NAME, "username").send_keys(username)
        self.driver.find_element(By.NAME, "password").send_keys(LOGIN_PASSWORD)
        self.driver.find_element(By.NAME, "submit").click()
        WebDriverWait(self.driver, 10).until(EC.url_contains("/"))

if __name__ == "__main__":
    unittest.main()
