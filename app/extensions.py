# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_migrate import Migrate

# Create extension instances
db = SQLAlchemy()               # for database access
login = LoginManager()          # to manage user login state
migrate = Migrate()             # to handle DB migrations