# ===== Import Required Modules =====
from flask_wtf import FlaskForm                                                 
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired
from wtforms import ValidationError
from wtforms.validators import Length, EqualTo, ValidationError
from app.models import UserDetails                                              
import re                                                                       

# ===== Login Form =====
class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

# ===== Sign-Up / Registration Form =====
class SignUpForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Submit')

    # ===== Custom Validator for Username =====
    def validate_username(self, field):
        username = field.data

        if len(username) < 3:
            raise ValidationError('Username must be at least 3 characters long.')

        if not re.match(r'^[A-Za-z0-9_-]+$', username):
            raise ValidationError('Username can only contain letters, numbers, underscores, and hyphens.')

        if UserDetails.query.filter_by(username=username).first():
            raise ValidationError('Username already exists. Please choose a different one.')
        
    # ===== Custom Validator for Password Complexity =====
    def validate_password(self, field):
        password=field.data
        # Check if the password meets the criteria
        if len(password) < 8:
            raise ValidationError('Password must be at least 8 characters long.')

        if not any(char.isdigit() for char in password):
            raise ValidationError('Password must contain at least one digit.')

        if not any(char.isupper() for char in password):
            raise ValidationError('Password must contain at least one upper case letter.')

        if not any(char.islower() for char in password):
            raise ValidationError('Password must contain at least one lower case letter.')

        if not any(char in '!@#$%^&*()_+' for char in password):
            raise ValidationError('Password must contain at least one special character.')