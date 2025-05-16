# ========== Import Required Modules ===========
from flask import Flask
from flask_wtf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from app.config import Config
from app.config import DeploymentConfig
from app.extensions import db, login, migrate
from app.blueprints import blueprint
import os

# Enable CSRF protection for form submissions
csrf = CSRFProtect()

# Function to create and configure a Flask application
def create_app(config = DeploymentConfig):
    # Create the Flask app instance
    app = Flask(__name__, instance_relative_config=True)

    # Load configuration from the specified config class (e.g., DeploymentConfig)
    app.config.from_object(config)

    from app.blueprints import blueprint
    app.register_blueprint(blueprint)

    # Initialize extensions with the app instance
    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    login.init_app(app)
    login.login_view = 'main.index'

    # Import routes and models so they are registered with the app
    from app import routes, models

    return app
