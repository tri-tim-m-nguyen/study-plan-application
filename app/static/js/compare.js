// compare.js - Specific JavaScript for compare.html page
document.addEventListener('DOMContentLoaded', function() {
    // Submit timetable request when form is submitted
    const requestForm = document.getElementById('request-timetable-form');
    if (requestForm) {
        requestForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('request-username').value;
            sendTimetableRequest(username);
        });
    }
    // Set up buttons and interaction handlers
    // Setup event listeners for accepting/rejecting requests
    setupRequestButtons();
  
    // Setup event listeners for viewing timetables
    setupTimetableViewButtons();
  
    // Setup event listeners for delinking timetables
    setupDelinkButtons();                               // Unshare timetable buttons
  
    // Check for new requests periodically (// Automatically check for new requests every 30 seconds)
    checkForNewRequests();
    setInterval(checkForNewRequests, 30000); // Check every 30 seconds
});

// Send timetable share request to another user
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
// Poll the backend to check for pending and shared timetable updates  
function checkForNewRequests() {
    if (!document.getElementById('pending-requests-list')) return;
  
    safeFetch('/check_requests', {
        method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updatePendingRequestsList(data.pending_requests);
            updateSharedTimetablesList(data.shared_timetables);
  
            // Show notification if there are new requests
            if (data.new_requests && data.new_requests.length > 0) {
                data.new_requests.forEach(req => {
                    showNotification(`New timetable request from ${req.from_username}`, 'info');
                });
            }
        }
    })
    .catch(error => {
        console.error('Error checking for requests:', error);
    });
}
// Display the list of pending timetable requests  
function updatePendingRequestsList(requests) {
    const container = document.getElementById('pending-requests-list');
    if (!container) return;
  
    if (!requests || requests.length === 0) {
        container.innerHTML = '<p>No pending requests</p>';
        return;
    }
  
    let html = '';
    requests.forEach(request => {
        html += `
            <div class="pending-request mb-2">
                <span>${request.from_username}</span>
                <button class="btn btn-sm btn-success accept-request ms-2" data-request-id="${request.id}">Accept</button>
                <button class="btn btn-sm btn-danger reject-request ms-1" data-request-id="${request.id}">Reject</button>
            </div>
        `;
    });
  
    container.innerHTML = html;
    setupRequestButtons();
}
// Display list of currently shared timetables  
function updateSharedTimetablesList(shared) {
    const container = document.getElementById('shared-timetables-list');
    if (!container) return;
  
    if (!shared || shared.length === 0) {
        container.innerHTML = '<p>No shared timetables</p>';
        return;
    }
  
    let html = '';
    shared.forEach(item => {
        html += `
            <div class="shared-timetable-item mb-2">
                <button class="btn btn-outline-primary view-timetable" data-username="${item.username}">
                    ${item.username}
                </button>
                <img src="https://cdn-icons-png.flaticon.com/512/1214/1214428.png" 
                     class="delink-button" 
                     data-username="${item.username}"
                     data-sharing-type="${item.type}"
                     alt="Remove sharing" 
                     title="Stop sharing timetable">
            </div>
        `;
    });
  
    container.innerHTML = html;
    setupTimetableViewButtons();                // Rebind view handlers
    setupDelinkButtons();                       // Rebind delink handlers
}
// Set up click handlers for Accept/Reject buttons on each request  
function setupRequestButtons() {
    // Set up accept buttons
    document.querySelectorAll('.accept-request').forEach(button => {
        button.addEventListener('click', function() {
            const requestId = this.getAttribute('data-request-id');
            respondToRequest(requestId, 'accept');
        });
    });
  
    // Set up reject buttons
    document.querySelectorAll('.reject-request').forEach(button => {
        button.addEventListener('click', function() {
            const requestId = this.getAttribute('data-request-id');
            respondToRequest(requestId, 'reject');
        });
    });
}
// Configure buttons to load the appropriate timetable  
function setupTimetableViewButtons() {
    // View other user's timetable
    document.querySelectorAll('.view-timetable').forEach(button => {
        button.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            loadUserTimetable(username);
            
            // Highlight the active button
            document.querySelectorAll('.view-timetable').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-primary');
        });
    });
  
    // View own timetable
    const ownTimetableBtn = document.getElementById('view-own-timetable');
    if (ownTimetableBtn) {
        ownTimetableBtn.addEventListener('click', function() {
            loadUserTimetable('');  // Empty username means load current user's timetable
            
            // Reset all other buttons
            document.querySelectorAll('.view-timetable').forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-primary');
            });
            
            // Highlight own button
            this.classList.remove('btn-outline-secondary');
            this.classList.add('btn-secondary');
            
            setTimeout(() => {
                this.classList.remove('btn-secondary');
                this.classList.add('btn-outline-secondary');
            }, 500);
        });
    }
}

// Set up click handler for removing shared timetable access
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

// Send request to backend to revoke shared timetable access
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

// Accept or reject a pending timetable request  
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

// Load a specific user's timetable (or own if username is blank)
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
            displayTimetable(data.timetable_data);
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

// Render the timetable slots in the UI using provided data
function displayTimetable(timetableData) {
    // Clear existing timetable
    const timeslots = document.querySelectorAll('.timeslot');
    timeslots.forEach(slot => {
        slot.style.backgroundColor = '';
    });
  
    // Display the new timetable data
    timetableData.forEach(slot => {
        const cell = findCell(slot.day_of_week, slot.start_time);
        if (cell) {
            cell.style.backgroundColor = slot.color || '#000000';
        }
    });
}
// Utility to show Bootstrap alert-style notifications  
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

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 150);
    }, 5000);
}