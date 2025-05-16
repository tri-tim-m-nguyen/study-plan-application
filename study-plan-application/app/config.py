import os

# ===== Determine Base Directory =====
# Gets the absolute path to the directory this config file is in
basedir = os.path.abspath(os.path.dirname(__file__))

# Define the path for the instance directory
instance_dir = os.path.join(basedir, '..', 'instance')
os.makedirs(instance_dir, exist_ok=True)

# Default path for the SQLite database
default_database_location = 'sqlite:///' + os.path.join(basedir, 'app.db')

# ===== Base Config Class =====
class Config:
    # Secret key for session management and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

# ===== Deployment Configuration =====
class DeploymentConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or default_database_location

# ===== Testing Configuration =====
class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'