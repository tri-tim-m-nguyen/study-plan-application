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

csrf = CSRFProtect()

def create_app(config = DeploymentConfig):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config)

    from app.blueprints import blueprint
    app.register_blueprint(blueprint)

    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    login.init_app(app)
    login.login_view = 'main.index'

    from app import routes, models

    return app
