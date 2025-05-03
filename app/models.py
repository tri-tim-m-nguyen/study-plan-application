from app import db

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