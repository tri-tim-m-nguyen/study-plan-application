let displayedTimetables = []; // Array to hold all displayed timetables

// compare.js - Specific JavaScript for compare.html page
document.addEventListener('DOMContentLoaded', function() {
    // Handle request form submission
    const requestForm = document.getElementById('request-timetable-form');
    if (requestForm) {
        requestForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('request-username').value;
            sendTimetableRequest(username);
        });
    }
  
    // Setup event listeners for viewing timetables
    setupTimetableViewButtons();
  
    // Setup event listeners for delinking timetables
    setupDelinkButtons();
  
    // Check for new requests periodically
    checkForNewRequests();
    setInterval(checkForNewRequests, 30000); // Check every 30 seconds
});
  
function sendTimetableRequest(username) {
    safeFetch('/request_timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Request sent successfully!', 'success');
            document.getElementById('request-username').value = '';
        } else {
            showNotification(data.error || 'Failed to send request', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while sending the request', 'danger');
    });
}
  
function setupTimetableViewButtons() {
    // View other user's timetable
    document.querySelectorAll('.view-timetable').forEach(button => {
        button.addEventListener('click', function () {
            const username = this.getAttribute('data-username');
            // Check if the button is already active
            const isActive = this.classList.contains('btn-primary');

            if (isActive) {
                // If active, remove only this user's timetable and reset the button
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline-primary');
                removeUserTimetable(username); // Remove only this user's timetable
            } else {
                // If not active, load the timetable and highlight the button
                loadUserTimetable(username);

                // Highlight the active button
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-primary');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // View own timetable
    const ownTimetableBtn = document.getElementById('view-own-timetable');
    if (ownTimetableBtn) {
        ownTimetableBtn.addEventListener('click', function () {
            // Check if the button is already active
            const isActive = this.classList.contains('btn-secondary');

            if (isActive) {
                // If active, remove the user's timetable but keep the button highlighted
                removeUserTimetable(''); // Remove the current user's timetable
                this.classList.remove('btn-secondary');
                this.classList.add('btn-outline-secondary');
            } else {
                // If not active, load the timetable and highlight the button
                loadUserTimetable(''); // Empty username means load current user's timetable

                // Highlight own button
                this.classList.remove('btn-outline-secondary');
                this.classList.add('btn-secondary');
            }
        });
    }
});
  
function setupDelinkButtons() {
    // Setup delink/trash buttons
    document.querySelectorAll('.delink-button').forEach(button => {
        button.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            const sharingType = this.getAttribute('data-sharing-type');
            
            if (confirm(`Are you sure you want to stop sharing timetables with ${username}?`)) {
                delinkTimetable(username, sharingType);
            }
        });
    });
}
  
function delinkTimetable(username, sharingType) {
    safeFetch('/delink_timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            username: username,
            sharing_type: sharingType
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification(`Timetable sharing with ${username} has been stopped`, 'success');
            // Refresh the shared timetables list
            checkForNewRequests();
            
            // If currently viewing that user's timetable, switch to own timetable
            const activeButton = document.querySelector('.view-timetable.btn-primary');
            if (activeButton && activeButton.getAttribute('data-username') === username) {
                document.getElementById('view-own-timetable').click();
            }
        } else {
            showNotification(data.error || 'Failed to stop sharing timetable', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred', 'danger');
    });
}
  
function respondToRequest(requestId, action) {
    safeFetch('/respond_to_request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            request_id: requestId,
            action: action
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification(`Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`, 'success');
            checkForNewRequests();  // Refresh the lists
        } else {
            showNotification(data.error || `Failed to ${action} request`, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred', 'danger');
    });
}
  
function loadUserTimetable(username) {
    safeFetch('/get_timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            const isUserTimetable = !username;

            // Add userid to each activity in timetableData
            const timetableDataWithUserId = data.timetable_data.map(activity => ({
                ...activity,
                userid: data.userid // Assuming the API returns a `userid` field
            }));

            // Update displayedTimetables
            displayedTimetables.push({ timetableData: timetableDataWithUserId, isUserTimetable });

            // Render the updated timetables
            displayTimetable();
            showNotification(`Viewing ${username ? username + "'s" : 'your'} timetable`, 'info');
        } else {
            showNotification(data.error || 'Failed to load timetable', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred while loading the timetable', 'danger');
    });
}
  
function displayTimetable(timetableData) {
    // Clear existing timetable
    const timeslots = document.querySelectorAll('.timeslot');
    timeslots.forEach(slot => {
        slot.style.backgroundColor = '';
        slot.classList.remove('full', 'partial');
    });
  
    // Display all timetables in light gray
    displayedTimetables.forEach(({ timetableData }) => {
        timetableData.forEach(slot => {
            const key = `${slot.day_of_week}-${slot.start_time}`;
            const id = `${slot.activity_id}`;
            const number = `${slot.activity_number}`;
            const cell = findCell(slot.day_of_week, slot.start_time);
            if (cell) {
                if (id != 0) {
                    cell.style.backgroundColor = 'lightgray'; // Default to light gray for all timetables
                } else if (number==="partial") {
                    if (cell.style.backgroundColor === '' || cell.style.backgroundColor === 'green') {
                        cell.style.backgroundColor = 'gold'; // Use gold for partial slots
                    }
                }
                else if (number==="full") {
                    if (cell.style.backgroundColor === '') {
                        cell.style.backgroundColor = 'green'; // Use green for partial slots
                    }
                }
            }
        });
    });

    // Overlay the current user's timetable in its assigned color
    displayedTimetables.forEach(({ timetableData, isUserTimetable }) => {
        if (isUserTimetable) {
            timetableData.forEach(slot => {
                const id = `${slot.activity_id}`;
                const number = `${slot.activity_number}`;
                const cell = findCell(slot.day_of_week, slot.start_time);
                if (cell) {
                    if (id != 0) {
                        cell.style.backgroundColor = slot.color; // Use the current user's color
                    } else if (number==="partial") {
                        if (cell.style.backgroundColor === '' || cell.style.backgroundColor === 'green') {
                            cell.style.backgroundColor = 'gold'; // Use gold for partial slots
                        }
                    }
                    else if (number==="full") {
                        if (cell.style.backgroundColor === '') {
                            cell.style.backgroundColor = 'green'; // Use green for partial slots
                        }
                    }
                }
            });
        }
    });
}

function removeUserTimetable(username) {
    if (!username) {
        // Remove the current user's timetable
        displayedTimetables = displayedTimetables.filter(({ isUserTimetable }) => !isUserTimetable);
        displayTimetable();
        return;
    }

    // Fetch the timetable to get the userid for the given username
    console.log("Removing timetable for username:", username);
    safeFetch('/get_userid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log("Response from /get_userid:", data);
        if (data.status === 'success' && data.user_id) {
            const useridToRemove = data.userid;
            // Filter out the timetable for the specified userid
            displayedTimetables = displayedTimetables.filter(({ timetableData }) => {
                return timetableData.every(activity => activity.userid !== useridToRemove);
            });

            // Re-render the remaining timetables
            displayTimetable();
        } else {
            console.error(`Failed to find timetable for username: ${username}`);
            showNotification(`Failed to remove timetable for ${username}`, 'danger');
        }
    })
    .catch(error => {
        console.error('Error while fetching timetable:', error);
        showNotification('An error occurred while removing the timetable', 'danger');
    });
}
        
function showNotification(message, type) {
    const notificationsContainer = document.getElementById('notifications');
    if (!notificationsContainer) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.role = 'alert';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    notificationsContainer.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 150);
    }, 5000);
}