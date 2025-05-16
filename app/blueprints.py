from flask import Blueprint

# Define a Blueprint named 'main' for grouping related routes and views
blueprint = Blueprint('main', __name__)

# Import routes and models to register them with the application context
from app import routes, models