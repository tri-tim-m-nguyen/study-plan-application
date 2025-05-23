# ====== Imports ======
from flask import render_template, flash, redirect, url_for, session, request, jsonify
from app.models import UserDetails, UserActivity, ActivityTimeSlot, TimetableRequest
from app.forms import LoginForm, SignUpForm
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from app.models import Assessment
from sqlalchemy import func
from app.blueprints import blueprint
from app import db
from flask import current_app

@blueprint.route('/')
@blueprint.route('/index')
def home():
    return render_template('index.html', title='Home', show_auth_links=True)

# Render signup form and handle user registration
@blueprint.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'username' in session:
        flash('Logout before creating a new account.', 'warning')
        return redirect(url_for('main.home'))
    form= SignUpForm()
    if form.validate_on_submit():
        
        #Create a new user with hashed password
        hashed_password = generate_password_hash(form.password.data)
        new_user = UserDetails(username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        
        # Automatically log the user in after registration
        session['username'] = new_user.username
        session['user_id'] = new_user.id
        
        flash('Registration successful! You have been automatically logged in.', 'success')
        users = UserDetails.query.all()
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Password Hash: {user.password}")
        return redirect(url_for('main.home'))

    return render_template('signup.html', form=form, title='Sign Up')

# Render login form and handle user login
@blueprint.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        #check if someone is already logged in
        if 'username' in session:
            flash('Another user is already logged in. Please log out first.', 'warning')
            return redirect(url_for('main.home'))
        
        #check if username exists in the database
        user = UserDetails.query.filter_by(username=form.username.data).first()
        #if username exists and password matches
        if user and check_password_hash(user.password, form.password.data):
            session['username'] = user.username
            session['user_id'] = user.id  # Store user ID in session
            flash(f'Welcome, {user.username}! Login successful', 'success')
            return redirect(url_for('main.home'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html', title='Sign In', form=form)

# Logout the current user by clearing session
@blueprint.route('/logout')
def logout():
    if 'username' in session:
        session.pop('username', None)
        session.pop('user_id', None)  # Also remove user_id from session
        flash('You have been logged out.', 'success')
    else:
        flash('No user is currently logged in.', 'warning')
    return redirect(url_for('main.home'))

# Save or update the timetable and related activities
@blueprint.route('/save_timetable', methods=['POST'])
def save_timetable():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 403

    user = UserDetails.query.filter_by(username=session['username']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Get the current activities before deletion (to compare later)
    current_units = set([act.activity_number for act in UserActivity.query.filter_by(
        user_id=user.id, activity_type='unit').all()])

    # Delete existing activities and time slots for this user
    user_activities = UserActivity.query.filter_by(user_id=user.id).all()
    for activity in user_activities:
        ActivityTimeSlot.query.filter_by(activity_id=activity.activity_id).delete()
    UserActivity.query.filter_by(user_id=user.id).delete()

    # Delete existing time slots for "full" and "partial" activities
    ActivityTimeSlot.query.filter(
        ActivityTimeSlot.user_id == user.id,
        ActivityTimeSlot.activity_id == 0).delete()
    
    data = request.get_json()
    activity_map = {}
    activity_colors = {}  # Track colors for each activity
    activity_types = {}  

    unit_activity_ids = set()
    # Collect unit activity info and validation
    for item in data.get('activities', []):
        act_no = item['activity_number']
        act_type = item.get('activity_type', 'normal')
        if act_type == 'unit':
            unit_activity_ids.add(act_no)
        if act_no not in activity_types:
            activity_types[act_no] = act_type
        if 'color' in item and item['color']:
            activity_colors[act_no] = item['color']

    unit_count = len(unit_activity_ids)
    
    # Find deleted units (units that existed before but are no longer present)
    deleted_units = current_units - unit_activity_ids
    
    # Delete assessments associated with deleted unit activities
    if deleted_units:
        for unit in deleted_units:
            Assessment.query.filter_by(user_id=user.id, unit=unit).delete()
    
    # Validate unit activity count
    if unit_count < 1 or unit_count > 4:
        return jsonify({'status': 'error', 'error': 'You must have between 1 and 4 unit activities.'}), 400

    # Second pass to create activities and time slots
    for item in data.get('activities', []):
        act_no = item['activity_number']
        day = item['day_of_week']
        start = item['start_time']
        end = item['end_time']
        act_type = activity_types.get(act_no, 'normal')

        if act_no not in ["full", "partial"] and act_no not in activity_map:
            new_act = UserActivity(
                user_id=user.id, 
                activity_number=act_no,
                color=activity_colors.get(act_no, None),  # Add color if available
                activity_type=act_type
            )
            db.session.add(new_act)
            db.session.flush()
            activity_map[act_no] = new_act.activity_id

        if act_no in ["full", "partial"]:
            # Save "full" or "partial" timeslots with activity_id = 0
            db.session.add(ActivityTimeSlot(
                user_id=user.id,
                activity_id=0,  # Set activity_id to 0
                activity_number=act_no,
                day_of_week=day,
                start_time=start,
                end_time=end
            ))
        else:
            # Save regular activity timeslots
            db.session.add(ActivityTimeSlot(
                user_id=user.id,
                activity_id=activity_map[act_no],
                activity_number=act_no,
                day_of_week=day,
                start_time=start,
                end_time=end,
            ))

    db.session.commit()
    return jsonify({'status': 'success'})

# Render the timetable creation page with any saved activities
@blueprint.route('/create')
def create():
    if 'user_id' not in session:
        flash('Please login to create timetables.', 'warning')
        return redirect(url_for('main.login'))
    user_activities = []
    
    # If user is logged in, fetch their saved activities
    if 'user_id' in session:
        user_id = session['user_id']
        
        # Query all activities for this user
        activities = UserActivity.query.filter_by(user_id=user_id).all()
        activity_colors = {act.activity_number: act.color for act in activities}
        
        # Get all time slots
        time_slots = ActivityTimeSlot.query.filter_by(user_id=user_id).all()
        
        # Convert time slots to a format the frontend can use
        for slot in time_slots:
            user_activities.append({
                'activity_number': slot.activity_number,
                'activity_id': slot.activity_id,
                'day_of_week': slot.day_of_week,
                'start_time': slot.start_time,
                'end_time': slot.end_time,
                'color': activity_colors.get(slot.activity_number),
                'activity_type': next(
                    (act.activity_type for act in activities if act.activity_number == slot.activity_number), 'normal')
            })
    
    return render_template('create.html', title='Create', user_activities=user_activities)

# Render compare page with pending and shared timetable requests
@blueprint.route('/compare')
def compare():
    if 'user_id' not in session:
        flash('Please login to compare timetables.', 'warning')
        return redirect(url_for('main.login'))
    
    user_id = session['user_id']
    
    # Get pending requests for this user
    pending_requests = []
    requests = TimetableRequest.query.filter_by(to_user_id=user_id, status='pending').all()
    for req in requests:
        pending_requests.append({
            'id': req.id,
            'from_username': req.from_user.username
        })
    
    # Get shared timetables (accepted requests)
    shared_timetables = []
    
    # Get timetables others have shared with this user
    from_others = TimetableRequest.query.filter_by(to_user_id=user_id, status='accepted').all()
    for req in from_others:
        shared_timetables.append({
            'username': req.from_user.username,
            'type': 'received'
        })
    
    # Get timetables this user has shared with others
    to_others = TimetableRequest.query.filter_by(from_user_id=user_id, status='accepted').all()
    for req in to_others:
        shared_timetables.append({
            'username': req.to_user.username,
            'type': 'sent'
        })
    
    return render_template('compare.html', title='Compare', 
                          pending_requests=pending_requests,
                          shared_timetables=shared_timetables)

# Send a timetable sharing request to another user
@blueprint.route('/request_timetable', methods=['POST'])
def request_timetable():
    # Logic for sending a request to view another user's timetable
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403
    
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    from_user_id = session['user_id']
    
    # Find the requested user
    to_user = UserDetails.query.filter_by(username=username).first()
    if not to_user:
        return jsonify({'error': 'User not found'}), 404
    
    # Don't allow requesting your own timetable
    if to_user.id == from_user_id:
        return jsonify({'error': 'You cannot request your own timetable'}), 400
    
    # Check if a request already exists or accepted
    existing_request = TimetableRequest.query.filter(
    ((TimetableRequest.from_user_id == from_user_id) & (TimetableRequest.to_user_id == to_user.id)) |
    ((TimetableRequest.from_user_id == to_user.id) & (TimetableRequest.to_user_id == from_user_id))
    ).filter(TimetableRequest.status.in_(['pending', 'accepted'])).first()
    
    if existing_request:
        if existing_request.status == 'pending':
            return jsonify({'error': 'You already have a pending request to this user.'}), 400
        elif existing_request.status == 'accepted':
            return jsonify({'error': 'You already have access to this user\'s timetable.'}), 400
    
    # Create a new request
    new_request = TimetableRequest(
        from_user_id=from_user_id,
        to_user_id=to_user.id,
        status='pending',
        created_at=datetime.utcnow()
    )
    
    db.session.add(new_request)
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Timetable request sent'})

# Check for incoming and shared timetable requests
@blueprint.route('/check_requests', methods=['GET'])
def check_requests():
    # Return pending and shared timetable requests
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403
    
    user_id = session['user_id']
    
    # Get pending requests
    pending_requests = []
    requests = TimetableRequest.query.filter_by(to_user_id=user_id, status='pending').all()

    # Keep track of new requests (could check timestamp for this in a real app)
    new_requests = []
    
    for req in requests:
        request_data = {
            'id': req.id,
            'from_username': req.from_user.username,
            'created_at': req.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        pending_requests.append(request_data)
        
        new_requests.append(request_data)
    
    # Get shared timetables (accepted requests)
    shared_timetables = []
    
    # Get timetables others have shared with current user
    from_others = TimetableRequest.query.filter_by(to_user_id=user_id, status='accepted').all()
    for req in from_others:
        shared_timetables.append({
            'username': req.from_user.username,
            'type': 'received'
        })
    
    # Get timetables current user has shared with others
    to_others = TimetableRequest.query.filter_by(from_user_id=user_id, status='accepted').all()
    for req in to_others:
        shared_timetables.append({
            'username': req.to_user.username,
            'type': 'sent'
        })
    
    return jsonify({
        'status': 'success',
        'pending_requests': pending_requests,
        'shared_timetables': shared_timetables,
        'new_requests': new_requests
    })

# Accept or reject a pending timetable request
@blueprint.route('/respond_to_request', methods=['POST'])
def respond_to_request():
    # Accept or reject incoming requests
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403
    
    data = request.get_json()
    request_id = data.get('request_id')
    action = data.get('action')  # 'accept' or 'reject'
    
    if not request_id or not action:
        return jsonify({'error': 'Request ID and action are required'}), 400
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action'}), 400
    
    user_id = session['user_id']
    
    # Find the request
    timetable_request = TimetableRequest.query.filter_by(id=request_id, to_user_id=user_id).first()
    
    if not timetable_request:
        return jsonify({'error': 'Request not found or you do not have permission'}), 404
    
    # Update the request status
    timetable_request.status = 'accepted' if action == 'accept' else 'rejected'
    timetable_request.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': f'Request {action}ed successfully'})

# Retrieve a user's timetable
@blueprint.route('/get_timetable', methods=['POST'])
def get_timetable():
    # Return timetable data for comparison
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403
    
    data = request.get_json()
    username = data.get('username', '')
    current_user_id = session['user_id']
    
    # If username is empty, return current user's timetable
    if not username:
        user_id = current_user_id
    else:
        # Find the user by username
        user = UserDetails.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        user_id = user.id
        
        # Check if the current user has permission to view this timetable
        # The user must have accepted a request from current user or sent an accepted request to current user
        has_permission = False
        
        # Check if the requested user accepted a request from current user
        sent_request = TimetableRequest.query.filter_by(
            from_user_id=current_user_id,
            to_user_id=user_id,
            status='accepted'
        ).first()
        
        # Check if the current user accepted a request from requested user
        received_request = TimetableRequest.query.filter_by(
            from_user_id=user_id,
            to_user_id=current_user_id,
            status='accepted'
        ).first()
        
        has_permission = sent_request is not None or received_request is not None
        
        if not has_permission:
            return jsonify({'error': 'You do not have permission to view this timetable'}), 403
    
    # Fetch timetable data for the user
    timetable_data = []
    
    # Get all activities for the user
    activities = UserActivity.query.filter_by(user_id=user_id).all()
    activity_colors = {act.activity_number: act.color for act in activities}
    
    # Get all time slots
    time_slots = ActivityTimeSlot.query.filter_by(user_id=user_id).all()
    
    # Convert time slots to a format the frontend can use
    for slot in time_slots:
        timetable_data.append({
            'activity_id': slot.activity_id,
            'activity_number': slot.activity_number,
            'day_of_week': slot.day_of_week,
            'start_time': slot.start_time,
            'end_time': slot.end_time,
            'color': activity_colors.get(slot.activity_number)
        })
    
    return jsonify({
        'status': 'success',
        'timetable_data': timetable_data,
        'user_id': user_id,
        'username': username if username else session['username']
    })

# Stop sharing timetable with a user
@blueprint.route('/delink_timetable', methods=['POST'])
def delink_timetable():
    # Stop sharing timetable between users
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403
    
    data = request.get_json()
    username = data.get('username')
    sharing_type = data.get('sharing_type')  # 'received' or 'sent'
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
    
    current_user_id = session['user_id']
    
    # Find the user by username
    user = UserDetails.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    other_user_id = user.id
    
    # Determine the request to delete based on sharing type
    if sharing_type == 'received':
        timetable_request = TimetableRequest.query.filter_by(
            from_user_id=other_user_id,
            to_user_id=current_user_id,
            status='accepted'
        ).first()
    else:  
        timetable_request = TimetableRequest.query.filter_by(
            from_user_id=current_user_id,
            to_user_id=other_user_id,
            status='accepted'
        ).first()
    
    if not timetable_request:
        return jsonify({'error': 'Timetable sharing not found'}), 404
    
    # Delete the request to stop sharing
    db.session.delete(timetable_request)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': f'Stopped sharing timetable with {username}'
    })

# Retrieve user ID based on username (used for AJAX lookups)
@blueprint.route('/get_userid', methods=['POST'])
def get_userid():
    # Ensure the user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 403

    # Parse the request data
    data = request.get_json()
    username = data.get('username')

    # Validate the username
    if not username:
        return jsonify({'error': 'Username is required'}), 400

    # Query the database for the user
    user = UserDetails.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Return the user_id
    return jsonify({'status': 'success', 'user_id': user.id})

# Render and handle submission of assessment data per unit
@blueprint.route('/assessments', methods=['GET', 'POST'])
def assessments():
    # View and add assessments by unit
    if 'user_id' not in session:
        flash('Please login to view assessments.', 'warning')
        return redirect(url_for('main.login'))

    user_id = session['user_id']

    unit_activities = UserActivity.query.filter_by(user_id=user_id, activity_type='unit').all()
    units = sorted(set([activity.activity_number for activity in unit_activities]))

    if request.method == 'POST':
        data = request.get_json()
        for unit, assessments in data.get('assessments', {}).items():
            for idx, assessment in enumerate(assessments):
                existing = Assessment.query.filter_by(
                    user_id=user_id,
                    unit=unit,
                    name=assessment['name']
                ).first()
                if not existing:
                    new_assessment = Assessment(
                        user_id=user_id,
                        unit=unit,
                        name=assessment['name'],
                        score_obtained=float(assessment['scoreObtained']),
                        score_total=float(assessment['scoreTotal']),
                        weightage=float(assessment['weightage']),
                        position=idx
                    )
                    db.session.add(new_assessment)
        db.session.commit()
        return jsonify({'status': 'success'})

    # Load saved assessments
    user_assessments = Assessment.query.filter_by(user_id=user_id).order_by(Assessment.position).all()
    assessments_by_unit = {}
    for unit in units:
        assessments_by_unit[unit] = []

    for a in user_assessments:
        assessments_by_unit[a.unit].append({
            "name": a.name,
            "scoreObtained": a.score_obtained,
            "scoreTotal": a.score_total,
            "weightage": a.weightage
        })

    return render_template(
        'assessments.html',
        title='Assessment',
        units=units,
        saved_assessments=assessments_by_unit
    )

# Delete an individual assessment entry
@blueprint.route('/assessments/delete', methods=['POST'])
def delete_assessment():
    # Delete an assessment by name and unit
    if 'user_id' not in session:
        return jsonify({'status': 'unauthorized'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unit = data.get('unit')
    name = data.get('name')

    if not unit or not name:
        return jsonify({'status': 'error', 'message': 'Missing unit or name'}), 400

    assessment = Assessment.query.filter_by(user_id=user_id, unit=unit, name=name).first()
    if assessment:
        db.session.delete(assessment)
        db.session.commit()
        return jsonify({'status': 'success'})

    return jsonify({'status': 'not_found'}), 404

# Update details of an existing assessment
@blueprint.route('/assessments/update', methods=['POST'])
def update_assessment():
    # Update existing assessment data
    if 'user_id' not in session:
        return jsonify({'status': 'unauthorized'}), 403

    data = request.get_json()
    user_id = session['user_id']
    unit = data.get('unit')
    name = data.get('name')  # original name (before editing)
    new_data = data.get('new_data')

    if not unit or not name or not new_data:
        return jsonify({'status': 'error', 'message': 'Incomplete data'}), 400
    
    current_app.logger.info(f"Updating {name} in unit {unit} with data: {new_data}")

    assessment = Assessment.query.filter_by(user_id=user_id, unit=unit, name=name).first()
    if not assessment:
        return jsonify({'status': 'not_found'}), 404

    assessment.name = new_data.get('name', assessment.name)

    if 'scoreObtained' in new_data:
        assessment.score_obtained = float(new_data['scoreObtained'])

    if 'scoreTotal' in new_data:
        assessment.score_total = float(new_data['scoreTotal'])

    if 'weightage' in new_data:
        assessment.weightage = float(new_data['weightage'])


    db.session.commit()
    return jsonify({'status': 'success'})

# Reorder assessment entries for a unit
@blueprint.route('/assessments/reorder', methods=['POST'])
def reorder_assessments():
    # Reorder assessments based on position
    if 'user_id' not in session:
        return jsonify({'status': 'unauthorized'}), 403

    data = request.get_json()
    unit = data.get('unit')
    order = data.get('order')  # List of assessment names in new order

    if not unit or not isinstance(order, list):
        return jsonify({'status': 'error', 'message': 'Invalid data'}), 400

    for pos, name in enumerate(order):
        assessment = Assessment.query.filter_by(user_id=session['user_id'], unit=unit, name=name).first()
        if assessment:
            assessment.position = pos

    db.session.commit()
    return jsonify({'status': 'success'})

# Render analytics page showing activity usage and average assessment scores
@blueprint.route('/analytics')
def analytics():
    if 'user_id' not in session:
        flash('Please login to view analytics.', 'warning')
        return redirect(url_for('main.login'))
    
    user_activities = []
    assessment_averages = []


    user_id = session['user_id']

    # Existing user activity processing...
    activities = UserActivity.query.filter_by(user_id=user_id).all()
    activity_colors = {act.activity_number: act.color for act in activities}
    time_slots = ActivityTimeSlot.query.filter_by(user_id=user_id).all()

    for slot in time_slots:
        if slot.activity_number not in ["full", "partial"]:
            user_activities.append({
                'activity_number': slot.activity_number,
                'day_of_week': slot.day_of_week,
                'start_time': slot.start_time,
                'end_time': slot.end_time,
                'color': activity_colors.get(slot.activity_number)
            })

    # NEW: Average scores per unit
    results = (
        db.session.query(Assessment.unit, func.avg(Assessment.score_obtained / Assessment.score_total * 100))
        .filter(Assessment.user_id == user_id)
        .group_by(Assessment.unit)
        .all()
    )
    assessment_averages = [{'unit': unit, 'average': round(avg, 2)} for unit, avg in results]

    return render_template('analytics.html',
                           title='Analytics',
                           user_activities=user_activities,
                           assessment_averages=assessment_averages)