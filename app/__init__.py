# ========== Import Required Modules ==========
from flask import Flask, request, render_template, redirect, url_for               
from flask_migrate import Migrate                                                  
from flask_sqlalchemy import SQLAlchemy                                            
from app.config import Config                                                       
from flask_wtf.csrf import CSRFProtect                                              
import os                                                                           

# ===== Initialize Flask App =====
app = Flask(__name__)

# Load configuration settings from config class
app.config.from_object(Config)

# ===== Database and Migration Setup =====
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# ===== Security Configuration =====
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secret_key') 

# Enable CSRF protection for all forms across the app
csrf = CSRFProtect(app)

# ===== Import Routes After Initialization =====
from app import routes