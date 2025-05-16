## Group Name: study-plan-application

### Team Members

| UWA ID   | Name                   | GitHub Username       |
| -------- | ---------------------- | --------------------- |
| 23941353 | Rayan Tarawneh         | RayanTarawneh         |
| 23897304 | Tri Nguyen             | Tri-tim-m-nguyen      |
| 23862402 | Kavishani Vimalathasan | KavishaniVimalathasan |

---

## Introduction

Welcome to our Study Plan Application! This website helps university students balance their workload by creating activities, scheduling timeslots, tracking assessments, and comparing timetables.

---

## How the Website Works

1. **Unauthenticated Access**: New users can view the home, signup, and login pages without an account.
2. **Registration & Login**: Create a unique username and password (meeting requirements) to register. Credentials are stored securely.
3. **Activities**:

   * After logging in, users can create up to **10 activities**, including at least **1 unit** activity. Up to **4 units** are special.
   * Activities can be renamed or recolored.
   * Users highlight timeslots on the timetable to assign activities (e.g., lectures, labs).
   * Timeslots can be marked as `fully` or `partially` available.
   * Save all changes to the database.
4. **Assessments**:

   * Upload assessments by selecting a unit, entering name, scored marks, total marks, and weightage.
   * Drag-and-drop to rearrange, edit, or delete assessments.
   * Validations prevent negative values.
5. **Compare Page**:

   * View your timetable (read-only) and send requests to other users by username.
   * Pending requests appear in the navbar; recipients can accept or reject.
   * Accepted links allow viewing another user’s timetable (other activities are greyed out).
   * Remove linked users at any time.
6. **Analytics Page**:

   * Displays average time spent on each activity.
   * Shows average grade per unit from uploaded assessments.
   * Helps students allocate study time effectively.

---

## How to Run the Website & Tests

```bash
# Clone repository
https://github.com/tri-tim-m-nguyen/study-plan-application.git
```

```bash
# Create a virtual environment for Windows (command prompt)
python -m venv venv
venv\Scripts\activate

# Create a virtual environment for Windows (powershell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Create a virtual environment for mac/linux
python3 -m venv venv
source venv/bin/activate
```

```bash
# Install dependencies
pip install -r requirements.txt
```

```bash
# Set Environment Variable for Windows (command prompt)
set SECRET_KEY=Greatest study plan creater

# Set Environment Variable for Windows (powershell)
$env:SECRET_KEY = "Greatest study plan creater"

# Set Environment Variable for Windows (command prompt)
export SECRET_KEY="Greatest study plan creater"
```

```bash
# Run the Flask application
flask run
```

```bash
# Run unit tests
python3 -m unittest tests.UnitTests
```

```bash
# Run Selenium tests
python3 -m unittest tests.SeleniumTests
```

---

## Unit Tests

1. **User Registration**: Verifies new user registration.
2. **Login**: Ensures registered user can log in.
3. **Logout**: Tests proper logout behavior.
4. **Timetable Save**: Confirms timetable, activities, and timeslots save correctly.
5. **Assessment Creation**: Validates assessment creation and association.

---

## Selenium Tests

1. **test\_1\_signup**: Tests user signup flow.
2. **test\_2\_logout**: Checks logout functionality.
3. **test\_3\_login**: Validates login process.
4. **test\_4\_create\_unit**: Tests creation of a unit activity.
5. **test\_5\_create\_assessment**: Verifies assessment creation.

---

We hope this README is clear. Enjoy reviewing our application! <3
