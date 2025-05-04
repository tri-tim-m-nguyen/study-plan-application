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

    // Setup event listeners for accepting/rejecting requests
    setupRequestButtons();

    // Setup event listeners for viewing timetables
    setupTimetableViewButtons();

    // Check for new requests periodically
    checkForNewRequests();
    setInterval(checkForNewRequests, 30000); // Check every 30 seconds
});

function sendTimetableRequest(username) {
    fetch('/request_timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username }),
        credentials: 'include'
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

function checkForNewRequests() {
    if (!document.getElementById('pending-requests-list')) return;

    fetch('/check_requests', {
        method: 'GET',
        credentials: 'include'
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
            </div>
        `;
    });

    container.innerHTML = html;
    setupTimetableViewButtons();
}

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

function respondToRequest(requestId, action) {
    fetch('/respond_to_request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            request_id: requestId,
            action: action
        }),
        credentials: 'include'
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
    fetch('/get_timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username }),
        credentials: 'include'
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