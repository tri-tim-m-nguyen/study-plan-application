# ========== Import Required Modules ==========
from flask import Flask, request, render_template, redirect, url_for                # Core Flask components
from flask_migrate import Migrate                                                   # Handles database migrations
from flask_sqlalchemy import SQLAlchemy                                             # ORM for database interaction
from app.config import Config                                                       # Custom config file (contains DB URI, etc.)
from flask_wtf.csrf import CSRFProtect                                              # CSRF protection for forms
import os                                                                           # For environment variable access

# ===== Initialize Flask App =====
app = Flask(__name__)

# Load configuration settings from config class
app.config.from_object(Config)

# ===== Database and Migration Setup =====
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ===== Security Configuration =====
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secret_key') # I have included a secret key to help run the login page

# Enable CSRF protection for all forms across the app
csrf = CSRFProtect(app)

# ===== Import Routes After Initialization =====
# This ensures all extensions are initialized before routes use them
from app import routes