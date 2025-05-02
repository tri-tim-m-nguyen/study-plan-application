from flask import render_template, flash, redirect, url_for
from app import app, db
from app.models import UserDetails
from app.forms import LoginForm
from app.forms import SignUpForm
from flask import flash, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask import session

@app.route('/')
@app.route('/index')
def home():
    return render_template('index.html', title='Home', show_auth_links=True)

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if 'username' in session:
        flash('Logout before creating a new account.', 'warning')
        return redirect(url_for('home'))
    form= SignUpForm()
    if form.validate_on_submit():
        # Registration occurs here
        existing_user = UserDetails.query.filter_by(username=form.username.data).first()
        if existing_user:
            flash('Username already exists. Please choose a different one.', 'danger')
            return redirect(url_for('signup'))
        
        #Create a new user with hashed password
        hashed_password = generate_password_hash(form.password.data)
        new_user = UserDetails(username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful!', 'success')
        users = UserDetails.query.all()
        for user in users:
            print(f"ID: {user.id}, Username: {user.username}, Password Hash: {user.password}")
        return redirect(url_for('home'))

    return render_template('signup.html', form=form, title='Sign Up')

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        #check if someone is already logged in
        if 'username' in session:
            flash('Another user is already logged in. Please log out first.', 'warning')
            return redirect(url_for('home'))
        
        #check if username exists in the database
        user = UserDetails.query.filter_by(username=form.username.data).first()
        #if username exists and password matches
        if user and check_password_hash(user.password, form.password.data):
            session['username'] = user.username
            flash(f'Welcome, {user.username}! Login successfull', 'success')
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password', 'danger')
    return render_template('login.html', title='Sign In', form=form)

@app.route('/logout')
def logout():
    if 'username' in session:
        session.pop('username', None)
        flash('You have been logged out.', 'success')
    else:
        flash('No user is currently logged in.', 'warning')
    return redirect(url_for('home'))

@app.route('/create')
def create():
    return render_template('create.html', title='Create')

@app.route('/view')
def view():
    return render_template('view.html', title='View')

@app.route('/compare')
def compare():
    return render_template('compare.html', title='Compare')