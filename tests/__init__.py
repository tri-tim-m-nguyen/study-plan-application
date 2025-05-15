from flask import Blueprint

bp = Blueprint('tests', __name__)

from app.tests import handlers