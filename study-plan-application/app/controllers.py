# controllers.py
from flask import render_template, flash, redirect, url_for, session, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from app.models import UserDetails, UserActivity, ActivityTimeSlot, TimetableRequest, Assessment
from app import db
from sqlalchemy import func

# --- Auth Controllers ---
# Handles user registration
def try_signup_user(form):
    if 'username' in session:
        flash('Logout before creating a new account.', 'warning')
        return redirect(url_for('main.home'))

    if form.validate_on_submit():
        user = UserDetails.query.filter_by(username=form.username.data).first()
        if user:
            flash('Username already exists.', 'danger')
            return redirect(url_for('main.signup'))

        hashed_password = generate_password_hash(form.password.data)
        new_user = UserDetails(username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful!', 'success')
        return redirect(url_for('main.home'))

# Manages login by checking credentials and initiating a user session
def try_login_user(form):
    if 'username' in session:
        flash('Another user is already logged in. Please log out first.', 'warning')
        return redirect(url_for('main.home'))

    if form.validate_on_submit():
        user = UserDetails.query.filter_by(username=form.username.data).first()
        if user and check_password_hash(user.password, form.password.data):
            session['username'] = user.username
            session['user_id'] = user.id
            flash(f'Welcome, {user.username}! Login successful', 'success')
            return redirect(url_for('main.home'))
        flash('Invalid username or password', 'danger')

# Logs out the user by clearing session data.
def logout_user_controller():
    session.pop('username', None)
    session.pop('user_id', None)
    flash('You have been logged out.', 'success')
    return redirect(url_for('main.home'))

# --- Timetable ---
# Renders the timetable creation view with existing activity data
def create_controller():
    user_activities = []
    if 'user_id' in session:
        uid = session['user_id']
        activities = UserActivity.query.filter_by(user_id=uid).all()
        colors = {a.activity_number: a.color for a in activities}
        slots = ActivityTimeSlot.query.filter_by(user_id=uid).all()
        for s in slots:
            user_activities.append({
                'activity_number': s.activity_number,
                'activity_id': s.activity_id,
                'day_of_week': s.day_of_week,
                'start_time': s.start_time,
                'end_time': s.end_time,
                'color': colors.get(s.activity_number),
                'activity_type': next((a.activity_type for a in activities if a.activity_number == s.activity_number), 'normal')
            })
    return render_template('create.html', title='Create', user_activities=user_activities)

# Saves the full timetable by clearing old data and inserting the new schedule.
def save_timetable_controller():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 403

    user = UserDetails.query.filter_by(username=session['username']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Delete existing
    for act in UserActivity.query.filter_by(user_id=user.id).all():
        ActivityTimeSlot.query.filter_by(activity_id=act.activity_id).delete()
    UserActivity.query.filter_by(user_id=user.id).delete()

    data = request.get_json()
    amap, acolors = {}, {}
    for i in data.get('activities', []):
        act_no = i['activity_number']
        if 'color' in i:
            acolors[act_no] = i['color']

    for i in data.get('activities', []):
        act_no, day, start, end = i['activity_number'], i['day_of_week'], i['start_time'], i['end_time']
        if act_no not in amap:
            new_act = UserActivity(user_id=user.id, activity_number=act_no, color=acolors.get(act_no))
            db.session.add(new_act)
            db.session.flush()
            amap[act_no] = new_act.activity_id

        db.session.add(ActivityTimeSlot(
            user_id=user.id,
            activity_id=amap[act_no],
            activity_number=act_no,
            day_of_week=day,
            start_time=start,
            end_time=end
        ))

    db.session.commit()
    return jsonify({'status': 'success'})

# --- Compare ---
# Displays pending and accepted timetable requests for the user.
def compare_controller():
    uid = session['user_id']
    pending = TimetableRequest.query.filter_by(to_user_id=uid, status='pending').all()
    pending_requests = [{'id': r.id, 'from_username': r.from_user.username} for r in pending]

    shared = []
    for req in TimetableRequest.query.filter_by(to_user_id=uid, status='accepted').all():
        shared.append({'username': req.from_user.username, 'type': 'received'})
    for req in TimetableRequest.query.filter_by(from_user_id=uid, status='accepted').all():
        shared.append({'username': req.to_user.username, 'type': 'sent'})

    return render_template('compare.html', title='Compare', pending_requests=pending_requests, shared_timetables=shared)

# Sends a timetable request to another user if one doesn't already exist.
def request_timetable_controller():
    uid = session['user_id']
    username = request.get_json().get('username')
    if not username:
        return jsonify({'error': 'Username is required'}), 400

    user = UserDetails.query.filter_by(username=username).first()
    if not user or user.id == uid:
        return jsonify({'error': 'Invalid user'}), 400

    existing = TimetableRequest.query.filter(
        ((TimetableRequest.from_user_id == uid) & (TimetableRequest.to_user_id == user.id)) |
        ((TimetableRequest.from_user_id == user.id) & (TimetableRequest.to_user_id == uid))
    ).filter(TimetableRequest.status.in_(['pending', 'accepted'])).first()

    if existing:
        return jsonify({'error': 'Request already exists'}), 400

    db.session.add(TimetableRequest(from_user_id=uid, to_user_id=user.id))
    db.session.commit()
    return jsonify({'status': 'success'})

# --- Additional Controllers ---
# Returns pending and accepted timetable sharing statuses
def check_requests_controller():
    uid = session['user_id']
    requests = TimetableRequest.query.filter_by(to_user_id=uid, status='pending').all()
    new_requests = [{
        'id': r.id,
        'from_username': r.from_user.username,
        'created_at': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for r in requests]

    shared = []
    for req in TimetableRequest.query.filter_by(to_user_id=uid, status='accepted').all():
        shared.append({'username': req.from_user.username, 'type': 'received'})
    for req in TimetableRequest.query.filter_by(from_user_id=uid, status='accepted').all():
        shared.append({'username': req.to_user.username, 'type': 'sent'})

    return jsonify({
        'status': 'success',
        'pending_requests': new_requests,
        'shared_timetables': shared,
        'new_requests': new_requests
    })

# Accepts or rejects a timetable sharing request.
def respond_to_request_controller():
    uid = session['user_id']
    data = request.get_json()
    req_id, action = data.get('request_id'), data.get('action')

    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action'}), 400

    req = TimetableRequest.query.filter_by(id=req_id, to_user_id=uid).first()
    if not req:
        return jsonify({'error': 'Request not found'}), 404

    req.status = 'accepted' if action == 'accept' else 'rejected'
    req.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'status': 'success'})

# Returns timetable data for the user or shared users with access.
def get_timetable_controller():
    uid = session['user_id']
    data = request.get_json()
    username = data.get('username', '')
    
    if not username:
        user_id = uid
    else:
        user = UserDetails.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        has_permission = TimetableRequest.query.filter(
            ((TimetableRequest.from_user_id == uid) & (TimetableRequest.to_user_id == user.id)) |
            ((TimetableRequest.from_user_id == user.id) & (TimetableRequest.to_user_id == uid))
        ).filter_by(status='accepted').first()

        if not has_permission:
            return jsonify({'error': 'No permission'}), 403
        user_id = user.id

    activities = UserActivity.query.filter_by(user_id=user_id).all()
    colors = {a.activity_number: a.color for a in activities}
    slots = ActivityTimeSlot.query.filter_by(user_id=user_id).all()
    timetable_data = [{
        'activity_id': s.activity_id,
        'activity_number': s.activity_number,
        'day_of_week': s.day_of_week,
        'start_time': s.start_time,
        'end_time': s.end_time,
        'color': colors.get(s.activity_number)
    } for s in slots]

    return jsonify({'status': 'success', 'timetable_data': timetable_data, 'user_id': user_id, 'username': username})

# Removes timetable sharing between users.
def delink_timetable_controller():
    uid = session['user_id']
    data = request.get_json()
    username, sharing_type = data.get('username'), data.get('sharing_type')
    
    user = UserDetails.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    other_id = user.id
    if sharing_type == 'received':
        req = TimetableRequest.query.filter_by(from_user_id=other_id, to_user_id=uid, status='accepted').first()
    else:
        req = TimetableRequest.query.filter_by(from_user_id=uid, to_user_id=other_id, status='accepted').first()

    if not req:
        return jsonify({'error': 'Sharing not found'}), 404

    db.session.delete(req)
    db.session.commit()
    return jsonify({'status': 'success'})

# Prepares and renders visual analytics on activity and assessment performance.
def analytics_controller():
    activities = []
    if 'user_id' in session:
        uid = session['user_id']
        acts = UserActivity.query.filter_by(user_id=uid).all()
        colors = {a.activity_number: a.color for a in acts}
        slots = ActivityTimeSlot.query.filter_by(user_id=uid).all()
        for s in slots:
            if s.activity_number not in ["full", "partial"]:
                activities.append({
                    'activity_number': s.activity_number,
                    'day_of_week': s.day_of_week,
                    'start_time': s.start_time,
                    'end_time': s.end_time,
                    'color': colors.get(s.activity_number)
                })
    results = db.session.query(Assessment.unit, func.avg(Assessment.score_obtained / Assessment.score_total * 100))\
        .filter_by(user_id=uid).group_by(Assessment.unit).all()
    averages = [{'unit': unit, 'average': round(avg, 2)} for unit, avg in results]
    return render_template('analytics.html', title='Analytics', user_activities=activities, assessment_averages=averages)

# Renders assessment page
def assessments_controller():
    uid = session['user_id']
    units = sorted(set([a.activity_number for a in UserActivity.query.filter_by(user_id=uid, activity_type='unit').all()]))
    if request.method == 'POST':
        data = request.get_json()
        for unit, assessments in data.get('assessments', {}).items():
            for idx, a in enumerate(assessments):
                existing = Assessment.query.filter_by(user_id=uid, unit=unit, name=a['name']).first()
                if not existing:
                    db.session.add(Assessment(
                        user_id=uid,
                        unit=unit,
                        name=a['name'],
                        score_obtained=float(a['scoreObtained']),
                        score_total=float(a['scoreTotal']),
                        weightage=float(a['weightage']),
                        position=idx
                    ))
        db.session.commit()
        return jsonify({'status': 'success'})

    saved = Assessment.query.filter_by(user_id=uid).order_by(Assessment.position).all()
    assessments_by_unit = {unit: [] for unit in units}
    for a in saved:
        assessments_by_unit[a.unit].append({
            "name": a.name,
            "scoreObtained": a.score_obtained,
            "scoreTotal": a.score_total,
            "weightage": a.weightage
        })
    return render_template('assessments.html', title='Assessment', units=units, saved_assessments=assessments_by_unit)

# Deletes an assessment based on name and unit.
def delete_assessment_controller():
    uid = session['user_id']
    data = request.get_json()
    unit, name = data.get('unit'), data.get('name')
    a = Assessment.query.filter_by(user_id=uid, unit=unit, name=name).first()
    if a:
        db.session.delete(a)
        db.session.commit()
        return jsonify({'status': 'success'})
    return jsonify({'status': 'not_found'}), 404

# Updates an existing assessment with new data
def update_assessment_controller():
    uid = session['user_id']
    data = request.get_json()
    unit, name, new_data = data.get('unit'), data.get('name'), data.get('new_data')
    a = Assessment.query.filter_by(user_id=uid, unit=unit, name=name).first()
    if not a:
        return jsonify({'status': 'not_found'}), 404
    a.name = new_data.get('name', a.name)
    if 'scoreObtained' in new_data:
        a.score_obtained = float(new_data['scoreObtained'])
    if 'scoreTotal' in new_data:
        a.score_total = float(new_data['scoreTotal'])
    if 'weightage' in new_data:
        a.weightage = float(new_data['weightage'])
    db.session.commit()
    return jsonify({'status': 'success'})

# Reorders assessments in a unit for consistent display
def reorder_assessments_controller():
    uid = session['user_id']
    data = request.get_json()
    unit, order = data.get('unit'), data.get('order')
    for pos, name in enumerate(order):
        a = Assessment.query.filter_by(user_id=uid, unit=unit, name=name).first()
        if a:
            a.position = pos
    db.session.commit()
    return jsonify({'status': 'success'})

# Returns user ID based on username
def get_userid_controller():
    data = request.get_json()
    username = data.get('username')
    user = UserDetails.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'status': 'success', 'user_id': user.id})

# Creates a new user with a hashed password.
def register_user(username, password):
    from werkzeug.security import generate_password_hash
    user = UserDetails(username=username, password=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    return user

# Verifies credentials
def login_user(username, password):
    user = UserDetails.query.filter_by(username=username).first()
    return user if user and check_password_hash(user.password, password) else None

# Clears the session.
def logout_user():
    session.clear()

# Function to save timetable data in bulk
def save_timetable(user_id, activities):
    UserActivity.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    amap = {}
    for item in activities:
        activity = UserActivity(user_id=user_id, activity_number=item['activity_number'], color=item.get('color'), activity_type=item.get('activity_type', 'normal'))
        db.session.add(activity)
        db.session.flush()
        amap[item['activity_number']] = activity.activity_id

        db.session.add(ActivityTimeSlot(
            user_id=user_id,
            activity_id=activity.activity_id,
            activity_number=item['activity_number'],
            day_of_week=item['day_of_week'],
            start_time=item['start_time'],
            end_time=item['end_time']
        ))
    db.session.commit()
    return {'status': 'success'}

# Function to create and store an assessment entry.
def create_assessment(user_id, unit, name, score_obtained, score_total, weightage):
    assessment = Assessment(
        user_id=user_id,
        unit=unit,
        name=name,
        score_obtained=score_obtained,
        score_total=score_total,
        weightage=weightage
    )
    db.session.add(assessment)
    db.session.commit()
    return assessment
