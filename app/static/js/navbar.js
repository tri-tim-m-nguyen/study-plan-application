document.addEventListener('DOMContentLoaded', function() {
    setupRequestButtons();
    checkForNewRequests();
    setInterval(checkForNewRequests, 30000);
});

function checkForNewRequests() {
    if (!document.getElementById('pending-requests-badge')) return;
  
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

function updatePendingRequestsList(pendingRequests) {
    const badge = document.getElementById('pending-requests-badge');
    const dropdown = document.getElementById('pending-requests-dropdown');

    // Update badge count
    const count = pendingRequests.length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline' : 'none';

    // Update dropdown
    if (count === 0) {
        dropdown.innerHTML = '<li><p class="dropdown-item text-muted">No pending requests</p></li>';
        return;
    }

    let html = '';
    pendingRequests.forEach(request => {
        html += `
            <li class="dropdown-item d-flex justify-content-between align-items-center">
                <span>${request.from_username}</span>
                <div>
                    <button class="btn btn-sm btn-success accept-request" data-request-id="${request.id}">Accept</button>
                    <button class="btn btn-sm btn-danger reject-request ms-1" data-request-id="${request.id}">Reject</button>
                </div>
            </li>
        `;
    });

    dropdown.innerHTML = html;
    setupRequestButtons();
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
    setupTimetableViewButtons();
    setupDelinkButtons();
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
            setupRequestButtons();

            const dropdown = document.querySelector('#inboxDropdown');
            if (dropdown) {
                const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdown);
                dropdownInstance.hide();
            }
        } else {
            showNotification(data.error || `Failed to ${action} request`, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred', 'danger');
    });
}