from flask import Flask, request, render_template, redirect, url_for
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from app.config import Config
import os

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)
migrate = Migrate(app, db)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secret_key') # I have included a secret key to help run the login page
from app import routes