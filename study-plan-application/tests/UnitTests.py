import unittest
from app import create_app
from app.models import UserDetails, UserActivity, ActivityTimeSlot, Assessment
from app.config import TestingConfig
from app.controllers import register_user, login_user, logout_user, save_timetable, create_assessment
from app.extensions import db
from flask import session


class StudyTests(unittest.TestCase):
    def setUp(self):
        # Set up Flask app for testing with test configuration
        self.app_instance = create_app(TestingConfig)
        self.app = self.app_instance.test_client()
        self.app_context = self.app_instance.app_context()
        self.app_context.push()
        db.create_all()
        super().setUp()

    def tearDown(self):
        # Remove session and drop all tables after each test
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
        super().tearDown()

    def test_register_user(self):
        # Test registering a new user
        user = register_user('testuser', 'Test123!')
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'testuser')

    def test_login_user(self):
        # Register user first
        register_user('testuser', 'Test123!')

        # Simulate login via POST request to /login route
        response = self.app.post('/login', data={
            'username': 'testuser',
            'password': 'Test123!'
        }, follow_redirects=True)

        # Assert successful login message is in response
        self.assertIn(b'Login successful', response.data)

        # Check if session is correctly set
        with self.app.session_transaction() as sess:
            self.assertEqual(sess.get('username'), 'testuser')

    def test_logout_user(self):
        # Register and log in user
        register_user('testuser', 'Test123!')
        user = login_user('testuser', 'Test123!')

        # Simulate setting session and logging out
        with self.app_instance.test_request_context():
            session['username'] = user.username
            session['user_id'] = user.id
            logout_user()
            self.assertIsNone(session.get('username'))

    def test_save_timetable(self):
        # Save a timetable entry and validate it is persisted
        user = register_user('testuser', 'Test123!')
        activities = [{
            'activity_number': '1',
            'day_of_week': 'Monday',
            'start_time': '09:00',
            'end_time': '10:00',
            'activity_type': 'normal',
            'color': '#ff0000'
        }]
        result = save_timetable(user.id, activities)
        self.assertEqual(result['status'], 'success')

        # Verify activity and time slot were saved
        activity = UserActivity.query.filter_by(user_id=user.id, activity_number='1').first()
        self.assertIsNotNone(activity)
        time_slot = ActivityTimeSlot.query.filter_by(user_id=user.id, activity_id=activity.activity_id).first()
        self.assertIsNotNone(time_slot)

    def test_create_assessment(self):
        # Test creation of an assessment entry
        user = register_user('testuser', 'Test123!')
        assessment = create_assessment(user.id, 'Unit1', 'Test Assessment', 80, 100, 20)
        self.assertIsNotNone(assessment)
        self.assertEqual(assessment.unit, 'Unit1')
        self.assertEqual(assessment.name, 'Test Assessment')

# Entry point for running the tests
if __name__ == '__main__':
    unittest.main()