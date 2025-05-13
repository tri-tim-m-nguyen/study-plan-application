# ===== Import Required Modules =====
from flask_wtf import FlaskForm                                                 # Base class for WTForms with CSRF protection
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired
from wtforms import ValidationError
from wtforms.validators import Length, EqualTo, ValidationError
from app.models import UserDetails                                              # For checking username uniqueness
import re                                                                       # For regex-based validation

# ===== Login Form =====
class LoginForm(FlaskForm):
    # Username field (required)
    username = StringField('Username', validators=[DataRequired()])
    # Password field (required)
    password = PasswordField('Password', validators=[DataRequired()])
    # Optional "Remember Me" checkbox
    remember_me = BooleanField('Remember Me')
    # Submit button
    submit = SubmitField('Sign In')

# ===== Sign-Up / Registration Form =====
class SignUpForm(FlaskForm):
    # Username input (required)
    username = StringField('Username', validators=[DataRequired()])
    # Password input (required)
    password = PasswordField('Password', validators=[DataRequired()])
    # Confirmation input — must match password
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    # Submit button
    submit = SubmitField('Submit')

    # ===== Custom Validator for Username =====
    def validate_username(self, field):
        username = field.data

        # Check minimum length
        if len(username) < 3:
            raise ValidationError('Username must be at least 3 characters long.')

        # Check allowed characters (alphanumeric, underscores, hyphens)
        if not re.match(r'^[A-Za-z0-9_-]+$', username):
            raise ValidationError('Username can only contain letters, numbers, underscores, and hyphens.')

        # Check uniqueness
        if UserDetails.query.filter_by(username=username).first():
            raise ValidationError('Username already exists. Please choose a different one.')
        
    # ===== Custom Validator for Password Complexity =====
    def validate_password(self, field):
        password=field.data
        # Check if the password meets the criteria
        # Enforce minimum length
        if len(password) < 8:
            raise ValidationError('Password must be at least 8 characters long.')
        # At least one digit
        if not any(char.isdigit() for char in password):
            raise ValidationError('Password must contain at least one digit.')
        # At least one uppercase letter
        if not any(char.isupper() for char in password):
            raise ValidationError('Password must contain at least one upper case letter.')
        # At least one lowercase letter
        if not any(char.islower() for char in password):
            raise ValidationError('Password must contain at least one lower case letter.')
        # At least one special character
        if not any(char in '!@#$%^&*()_+' for char in password):
            raise ValidationError('Password must contain at least one special character.')