# study-plan-application

Group 37
UWA ID | Name | Github Username
--- | --- | ---
23897304 | Tri Nguyen | Tri-tim-m-nguyen
23862402 | Kavishani Vimalathasan | KavishaniVimalathasan

Welcome to our website.

EXPLANATION ON HOW THE WEBSITE WORKS AND ALL PAGES:

This website is designed to help uni students balance their uni work load. 
A new user is only able to view the home page, signup page and login page if they are not signed into an account.
Once an account is created with a unique username and the password meets the requirements their information are saved to the database securely.
When signed in users can create up to 10 activites on the create page where at least 1 of those activities have to be labeled as a 'unit'.
Users can have up to 4 units and act as 'special' activities.
The activities a user creates can be customised by changing the name (if they double click it) or by changing the color that is associated to it.
After creating any activity a user likes they can highlight on the timetable and fill in timeslots that an activity would take up in their daily life.
Such as filling in what time a student has Their Agile web dev lecture and labs.
Activities can also be deleted if necessary.
Students can also highlight timeslots on their timetable that they are 'fully' or 'partially' avaialable (aka they are free to do something)
Once done all changes to the timetable and activites section can be saved to the database wit the save button.

Once done with the activities section students can go to the assessments page and upload any assessments they want.
Students will select which unit they want to upload an assessment for where they can then fill in the name, mark they scored, total marks and weightage of the assessment and save it.
Assessments can be rearanged by dragging them one ontop of another if wanted.
Assessments can also be edited by the edit button when hovering over the assessment and can also be deleted
Input validation is done so that users cannot put in negative values.

After that users can also head to the compare page where they can view their timetable (in read only mode) and send requests to other users.
To send a request you can type in the username of another user that you would like access to view their timetable.
All users have unique usernames so you don't have to work about sending a request to the wrong person.
After sending a request, the person being requested from will get a notification in the nave bar where if they click the notification icon, a drop down will appear of the users that have requested their timetable and the user can either accept or reject these requests.
Once a request has been accepted users can then compare eachothers timetables by clicking the user that they have permission to view. 
Selected user timetables will be displayed on the timetable where other users activities are greyed out for 'privacy' reasons and users will only be able to see what times another user is 'fully' or 'partially' available.
After users are done sharing they can delink or delete the users they have access to which will sever the link between those two users.

The last page is the analytics page
This page will display the average time a user spends on each activity and will show users their average grade for each unit they have based on the assessments that they have uploaded. 
The purpose of this page is to help users see what activites are tacking up the most time and how much time they are spending on each activity.
It also allows students to see what their current average grade is for each unit to see how well they are doing for all their units.
In return this will help them make decisions on if they need to assign more time to a 'unit' activity for better marks or if they have enough time for different other activities.

EXPLANATION ON HOW TO RUN THE WEBSITE AND THE TESTS:

Before running the website please install all neccessary packages using this command:
pip install -r requirements.txt
Then you can run the website with the following command:
flask run
If you wish to run the unit tests use this command:
python3 -m unittest tests.UnitTests
If you wish to run the selenium tests use this command:
python3 -m unittest tests.SeleniumTests

WHAT THE UNIT TESTS DO:

The first unit test verifies that a new user can be successfully registered.
The second ensures that a registered user can log in successfully through the application's login route.
The third tests that a logged-in user can be logged out properly.
The fourth validates that a user's timetable can be saved correctly, and the associated activity and time slot entries are persisted in the database.
The fifth ensures that an assessment can be created and associated with a user.

WHAT THE SELENIUM TESTS DO:

The first Selenium test (test_1_signup) verifies the user registration process.
The second Selenium test (test_2_logout) checks the logout functionality.
The third Selenium test (test_3_login) validates the login process.
The fourth Selenium test (test_4_create_unit) tests unit creation in the timetable.
The sixth Selenium test (test_5_create_assessment) verifies assessment creation.

I hope the readme was straight forward and you enjoy marking our website <3
