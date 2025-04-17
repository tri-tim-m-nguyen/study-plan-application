from flask import render_template, flash, redirect, url_for
from app import app
from app.forms import LoginForm

@app.route('/')
@app.route('/index')
def home():
    return render_template('index.html', title='Home')

@app.route('/signup')
def signup():
    return render_template('signup.html', title='Sign Up')

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        flash('Login requested for user {}, remember_me={}'.format(
            form.username.data, form.remember_me.data))
        return redirect(url_for('index'))
    return render_template('login.html', title='Sign In', form=form)

@app.route('/create')
def create():
    return render_template('create.html', title='Create')

@app.route('/view')
def view():
    return render_template('view.html', title='View')

@app.route('/compare')
def compare():
    return render_template('compare.html', title='Compare')