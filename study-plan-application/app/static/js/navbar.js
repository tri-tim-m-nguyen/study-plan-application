// Run this once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    setupRequestButtons();
    checkForNewRequests();
    setInterval(checkForNewRequests, 30000);
});

// Function to fetch and update pending requests and shared timetables
function checkForNewRequests() {
    // If the badge element doesn't exist, it stops 
    if (!document.getElementById('pending-requests-badge')) return;

    // Make a GET request to check for new requests
    safeFetch('/check_requests', {
        method: 'GET',
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updatePendingRequestsList(data.pending_requests);
            updateSharedTimetablesList(data.shared_timetables);
        }
    })
    .catch(error => {
        console.error('Error checking for requests:', error);
    });
}

// Updates the pending requests badge and dropdown list
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

    //build HTML for each request entry
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

// Attaches click handlers for dynamically created Accept/Reject buttons
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

// Updates the "Shared Timetables" list on the sidebar or page
function updateSharedTimetablesList(shared) {
    const container = document.getElementById('shared-timetables-list');
    if (!container) return;

    // If no shared timetables, display a placeholder message
    if (!shared || shared.length === 0) {
        container.innerHTML = '<p>No shared timetables</p>';
        return;
    }

    // Build and insert HTML for each shared user
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

    // Attach event listeners to view and delink buttons
    setupTimetableViewButtons();
    setupDelinkButtons();
}

// Responds to a request by sending an accept/reject action to the server
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
            // Show a success message and refresh request list
            showNotification(`Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`, 'success');
            checkForNewRequests();  // Refresh the lists
            setupRequestButtons();

            // Close the dropdown menu if open
            const dropdown = document.querySelector('#inboxDropdown');
            if (dropdown) {
                const dropdownInstance = bootstrap.Dropdown.getOrCreateInstance(dropdown);
                dropdownInstance.hide();
            }
        } else {
            // Display error message from server
            showNotification(data.error || `Failed to ${action} request`, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred', 'danger');
    });
}