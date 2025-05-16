from flask_migrate import Migrate
from app import create_app, db
from app.config import DeploymentConfig

# Entry point to run Flask app with migration support
if __name__ == '__main__':
    app = create_app(DeploymentConfig)          # Create app using deployment config
    migrate = Migrate(app, db)                  # Initialize Flask-Migrate with app and database
