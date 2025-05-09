from app import db
from datetime import datetime

class UserDetails(db.Model):
    __tablename__ = 'user_details'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(200), nullable=False, unique=True)
    password = db.Column(db.String(200), nullable=False)
    permission = db.Column(db.String(200), nullable=True)

class UserActivity(db.Model):
    __tablename__ = 'user_activity'
    activity_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_details.id'), nullable=False)
    activity_number = db.Column(db.String(200), nullable=False)
    activity_type = db.Column(db.String(20), default='normal') 
    color = db.Column(db.String(20), nullable=True)  # Store the hex color code

    user = db.relationship('UserDetails', backref=db.backref('activities', lazy=True))
    time_slots = db.relationship('ActivityTimeSlot', backref='activity', lazy=True)

class ActivityTimeSlot(db.Model):
    __tablename__ = 'activity_time_slot'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_details.id'), nullable=False)
    activity_id = db.Column(db.Integer, db.ForeignKey('user_activity.activity_id'), nullable=False)
    activity_number = db.Column(db.String(200), nullable=False)
    day_of_week = db.Column(db.String(20), nullable=False)
    start_time = db.Column(db.String(20), nullable=False)
    end_time = db.Column(db.String(20), nullable=False)

    user = db.relationship('UserDetails', backref=db.backref('time_slots', lazy=True))

class TimetableRequest(db.Model):
    __tablename__ = 'timetable_request'
    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('user_details.id'), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey('user_details.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships to get username easily
    from_user = db.relationship('UserDetails', foreign_keys=[from_user_id], backref='sent_requests')
    to_user = db.relationship('UserDetails', foreign_keys=[to_user_id], backref='received_requests')

class Assessment(db.Model):
    __tablename__='assessments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_details.id'), nullable=False)
    unit = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    score_obtained = db.Column(db.Float, nullable=False)
    score_total = db.Column(db.Float, nullable=False)
    weightage = db.Column(db.Float, nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)

    user = db.relationship('UserDetails', backref=db.backref('assessments', lazy=True))