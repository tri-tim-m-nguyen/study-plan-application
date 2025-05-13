import os

# ===== Determine Base Directory =====
# Gets the absolute path to the directory this config file is in
basedir = os.path.abspath(os.path.dirname(__file__))

# ===== Default SQLite Database Path =====
# Fallback if DATABASE_URL environment variable is not set
default_database_location = 'sqlite:///' + os.path.join(basedir, 'app.db')

# ===== Configuration Class =====
class Config(object):
    # Set SQLAlchemy database URI
    # Use DATABASE_URL from environment if available, otherwise use default SQLite path
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL') or default_database_location
    
