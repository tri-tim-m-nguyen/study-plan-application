// compare.js - Specific JavaScript for compare.html page

let displayedTimetables = []; // { username, timetableData, isUserTimetable }

// Run once on DOM ready
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
  
    // Setup initial buttons
    setupTimetableViewButtons();
    setupDelinkButtons();  // Unshare timetable buttons
  
    // Kick off periodic background checks + sync
    checkForNewRequests();
    syncDisplayedTimetables();
    setInterval(() => {
        checkForNewRequests();
        syncDisplayedTimetables();
    }, 5000);
});

// Send timetable share request to another user
function sendTimetableRequest(username) {
    safeFetch('/request_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification('Request sent successfully!', 'success');
            document.getElementById('request-username').value = '';
        } else {
            showNotification(data.error || 'Failed to send request', 'danger');
        }
    })
    .catch(() => {
        showNotification('An error occurred while sending the request', 'danger');
    });
}

// --- VIEW / HIDE TIMETABLE BUTTONS ---

function setupTimetableViewButtons() {
    document.querySelectorAll('.view-timetable').forEach(button => {
        button.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            const isActive = this.classList.contains('btn-primary');

            if (isActive) {
                // Turn *off* this user’s view
                this.classList.replace('btn-primary','btn-outline-primary');
                removeUserTimetable(username);
            } else {
                // Turn *on* this user’s view
                loadUserTimetable(username);
                this.classList.replace('btn-outline-primary','btn-primary');
            }
        });
    });
}

// Handle your own timetable button
document.addEventListener('DOMContentLoaded', function() {
    const ownBtn = document.getElementById('view-own-timetable');
    if (!ownBtn) return;

    ownBtn.addEventListener('click', function () {
        const isActive = this.classList.contains('btn-secondary');

        if (isActive) {
            // Turn off
            this.classList.replace('btn-secondary','btn-outline-secondary');
            removeUserTimetable('');
        } else {
            // Turn on
            this.classList.replace('btn-outline-secondary','btn-secondary');
            loadUserTimetable('');
        }
    });
});

// --- UNLINK BUTTONS (stop sharing) ---

function setupDelinkButtons() {
    document.querySelectorAll('.delink-button').forEach(button => {
        button.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            const sharingType = this.getAttribute('data-sharing-type');
            
            if (confirm(`Stop sharing timetables with ${username}?`)) {
                delinkTimetable(username, sharingType);
            }
        });
    });
}

function delinkTimetable(username, sharingType) {
    safeFetch('/delink_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, sharing_type: sharingType }),
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            showNotification(`Stopped sharing with ${username}`, 'success');
            checkForNewRequests();        // refresh sidebar
            removeUserTimetable(username); 
            // If they were active, fall back to your own
            const activeBtn = document.querySelector('.view-timetable.btn-primary');
            if (activeBtn?.getAttribute('data-username') === username) {
                document.getElementById('view-own-timetable').click();
            }
        } else {
            showNotification(data.error || 'Failed to stop sharing', 'danger');
        }
    })
    .catch(() => {
        showNotification('An error occurred', 'danger');
    });
}

// --- LOADING & RENDERING TIMETABLES ---

function loadUserTimetable(username) {
    safeFetch('/get_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
    })
    .then(r => r.json())
    .then(data => {
        if (data.status === 'success') {
            const isOwn = (username === '');
            const withUserId = data.timetable_data.map(a => ({
                ...a,
                user_id: data.user_id
            }));

            // Store username to allow sync pruning
            displayedTimetables.push({
                username, 
                timetableData: withUserId, 
                isUserTimetable: isOwn
            });

            displayTimetable();
            showNotification(`Viewing ${username? username + "'s": 'your'} timetable`, 'info');
        } else {
            showNotification(data.error || 'Failed to load timetable', 'danger');
        }
    })
    .catch(() => {
        showNotification('An error occurred while loading the timetable', 'danger');
    });
}

function displayTimetable() {
    // Clear all slots
    document.querySelectorAll('.timeslot').forEach(cell => {
        cell.style.backgroundColor = '';
        cell.classList.remove('full','partial');
    });

    // Draw all shared/others in light gray
    displayedTimetables.forEach(({ timetableData }) => {
        timetableData.forEach(slot => {
            const cell = findCell(slot.day_of_week, slot.start_time);
            if (!cell) return;
            if (slot.activity_id != 0) {
                cell.style.backgroundColor = 'lightgray';
            } else if (slot.activity_number === "partial" && 
                       ['','green'].includes(cell.style.backgroundColor)) {
                cell.style.backgroundColor = 'gold';
            } else if (slot.activity_number === "full" && cell.style.backgroundColor === '') {
                cell.style.backgroundColor = 'green';
            }
        });
    });

    // Overlay your own in color
    displayedTimetables
      .filter(e => e.isUserTimetable)
      .forEach(({ timetableData }) => {
        timetableData.forEach(slot => {
            const cell = findCell(slot.day_of_week, slot.start_time);
            if (!cell) return;
            if (slot.activity_id != 0) {
                cell.style.backgroundColor = slot.color;
            } else if (slot.activity_number === "partial" && 
                       ['','green'].includes(cell.style.backgroundColor)) {
                cell.style.backgroundColor = 'gold';
            } else if (slot.activity_number === "full" && cell.style.backgroundColor === '') {
                cell.style.backgroundColor = 'green';
            }
        });
    });
}

function removeUserTimetable(username) {
    if (username === '') {
        // drop your own
        displayedTimetables = displayedTimetables.filter(e => !e.isUserTimetable);
        displayTimetable();
        return;
    }

    // find their user_id then drop by matching username tag
    displayedTimetables = displayedTimetables.filter(e => e.username !== username);
    displayTimetable();
}

// --- KEEP displayedTimetables IN SYNC WITH ACTIVE BUTTONS ---

function syncDisplayedTimetables() {
    // gather active usernames
    const actives = Array.from(
        document.querySelectorAll('.view-timetable.btn-primary')
    ).map(b => b.getAttribute('data-username'));
    const ownBtn = document.getElementById('view-own-timetable');
    if (ownBtn?.classList.contains('btn-secondary')) {
        actives.push('');
    }

    displayedTimetables = displayedTimetables.filter(e => {
        return actives.includes(e.username);
    });

    displayTimetable();
}

// --- NOTIFICATIONS ---

function showNotification(message, type) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const note = document.createElement('div');
    note.className = `alert alert-${type} alert-dismissible fade show`;
    note.role = 'alert';
    note.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    container.appendChild(note);
    setTimeout(() => {
        note.classList.remove('show');
        setTimeout(() => note.remove(), 150);
    }, 5000);
}
