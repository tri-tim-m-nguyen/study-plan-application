import unittest

from app.models import UserDetails, UserActivity, ActivityTimeSlot, TimetableRequest, Assessment
from app import db

class unitTests(unittest.TestCase):
    def setUp(self):
        # Set up the test client and database
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        # Clean up after each test
        db.session.remove()
        db.drop_all()
        self.app_context.pop()