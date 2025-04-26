from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired
from wtforms import ValidationError
from wtforms.validators import Length, EqualTo, ValidationError

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

class SignUpForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password', message='Passwords must match')])
    submit = SubmitField('Submit')

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


