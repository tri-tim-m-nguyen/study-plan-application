from flask import render_template
from app import application


@application.route('/')
def home():
    return render_template('home.html')