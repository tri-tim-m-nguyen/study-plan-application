from flask import Flask

app = Flask(__name__)
app.config['SECRET_KEY'] = "Best study plan creater" # I have included a secret key to help run the login page

from app import routes