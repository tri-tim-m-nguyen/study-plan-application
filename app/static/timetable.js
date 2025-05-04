let activityCount = 0;
let focusedActivity = null;

// Store activity-to-cells mapping
const activityCellMap = new Map();
// NEW: Store cell-to-activity mapping to track which activity owns each cell
const cellActivityMap = new Map();

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function addActivity(name = null, color = null) {
    if (activityCount >= 10) return null;

    activityCount += 1;
    const activityId = name || 'Activity' + activityCount;

    const activityBox = document.createElement('div');
    activityBox.classList.add('activity-box');
    activityBox.dataset.activityName = activityId;

    const deleteIcon = document.createElement('img');
    deleteIcon.src = 'https://cdn-icons-png.flaticon.com/512/1214/1214428.png'; // red bin icon
    deleteIcon.alt = 'Delete';
    deleteIcon.className = 'delete-icon';
    deleteIcon.title = 'Delete activity';
    deleteIcon.onclick = () => {
        // Get the activity name before removing
        const activityName = activityBox.dataset.activityName;
        
        // Clear any mapping of cells for this activity
        if (activityCellMap.has(activityBox)) {
            const cells = activityCellMap.get(activityBox);
            cells.forEach(cell => {
                cell.style.backgroundColor = ""; // remove color
                // Remove this cell from the cell-to-activity mapping
                cellActivityMap.delete(cell);
            });
            activityCellMap.delete(activityBox);
        }
        
        // If this was the focused activity, clear the focus
        if (focusedActivity === activityBox) {
            focusedActivity = null;
        }
        
        // Remove the activity box from the UI
        activityBox.remove();
        activityCount -= 1;
        
        // Show add button again if below limit
        if (activityCount < 10) {
            document.getElementById('add-button').style.display = 'inline-block';
        }
        
        // Automatically save the timetable to update the database
        saveTimeTable();
    };

    const activityText = document.createElement('div');
    activityText.className = 'activity-text';
    activityText.contentEditable = false;
    activityText.textContent = activityId;

    const colorBox = document.createElement('div');
    colorBox.className = 'activity-color-box';
    colorBox.style.backgroundColor = color || getRandomColor();

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'hidden-color-input';
    colorInput.value = colorBox.style.backgroundColor;

    colorBox.onclick = () => {
        colorInput.click();
    };

    colorInput.addEventListener('input', () => {
        const newColor = colorInput.value;
        colorBox.style.backgroundColor = newColor;
        
        // Update all cells associated with this activity
        if (activityCellMap.has(activityBox)) {
            const cells = activityCellMap.get(activityBox);
            cells.forEach(cell => {
                cell.style.backgroundColor = newColor;
            });
        }
        
        // Save the color change to the database
        saveTimeTable(false);
    });

    // Focus on activity box on click
    activityBox.addEventListener('click', (e) => {
        // Prevent triggering when clicking on delete icon, color box or color input
        if (e.target === deleteIcon || e.target === colorBox || e.target === colorInput) return;
        
        if (focusedActivity === activityBox) {
            // Remove focus if clicked again
            focusedActivity = null;
            activityBox.classList.remove('focused');
        } else {
            // Set focus
            if (focusedActivity) {
                focusedActivity.classList.remove('focused'); // Remove class from previously focused activity
            }
            focusedActivity = activityBox;
            activityBox.classList.add('focused'); // Add class to indicate focus
        }
    });

    activityText.addEventListener('dblclick', () => {
        activityText.contentEditable = true;
        activityText.focus();
    });
    activityText.addEventListener('blur', () => {
        activityText.contentEditable = false;
    });

    activityBox.appendChild(activityText);
    activityBox.appendChild(deleteIcon);
    activityBox.appendChild(colorBox);
    activityBox.appendChild(colorInput);

    const container = document.getElementById('activity-container');
    const addButton = document.getElementById('add-button');
    container.insertBefore(activityBox, addButton);

    if (activityCount === 10) {
        addButton.style.display = 'none';
    }

    return activityBox;
}

// Function to find cell by day and time
function findCell(day, startTime) {
    const dayIndexMap = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
    const dayIndex = dayIndexMap[day];
    
    if (!dayIndex) return null;
    
    const rows = document.querySelectorAll('.timetable tr');
    for (let i = 1; i < rows.length; i++) { // Skip header row
        const timeCell = rows[i].cells[0];
        if (timeCell.textContent.trim() === startTime) {
            return rows[i].cells[dayIndex];
        }
    }
    return null;
}

// Function to load saved activities from database
function loadSavedActivities() {
    // Use window.userSavedActivities instead of savedActivities
    if (typeof window.userSavedActivities === 'undefined' || !Array.isArray(window.userSavedActivities) || window.userSavedActivities.length === 0) {
        return;
    }
    
    // Group time slots by activity
    const activitiesMap = {};
    window.userSavedActivities.forEach(slot => {
        if (!activitiesMap[slot.activity_number]) {
            activitiesMap[slot.activity_number] = {
                slots: [],
                color: slot.color || getRandomColor() // Use saved color if available, else random
            };
        }
        activitiesMap[slot.activity_number].slots.push(slot);
    });
    
    // Create activities and populate cells
    for (const [actName, actData] of Object.entries(activitiesMap)) {
        const activityBox = addActivity(actName, actData.color);
        
        if (!activityBox) continue; // Skip if we couldn't create the activity (e.g., limit reached)
        
        if (!activityCellMap.has(activityBox)) {
            activityCellMap.set(activityBox, new Set());
        }
        
        // For each time slot of this activity
        actData.slots.forEach(slot => {
            const cell = findCell(slot.day_of_week, slot.start_time);
            if (cell) {
                cell.style.backgroundColor = actData.color;
                activityCellMap.get(activityBox).add(cell);
                // NEW: Track which activity owns this cell
                cellActivityMap.set(cell, activityBox);
            }
        });
    }
}

let availabilityState = true;

// Add event listener for cell clicks in timetable
document.addEventListener("DOMContentLoaded", function () {

    // event listeners for toggling fully available and partially available parameters. 
    const fullyUnavailableToggle = document.getElementById('toggle-selected');
    const partiallyUnavailableToggle = document.getElementById('toggle-pselected');
    fullyUnavailableToggle.classList.add('active');

    fullyUnavailableToggle.addEventListener('click', () => {
        if (availabilityState !== true) {
            availabilityState = true;
            fullyUnavailableToggle.classList.add('active');
            partiallyUnavailableToggle.classList.remove('active');
        }
    });

    partiallyUnavailableToggle.addEventListener('click', () => {
        if (availabilityState !== false) {
            availabilityState = false;
            partiallyUnavailableToggle.classList.add('active');
            fullyUnavailableToggle.classList.remove('active');
        }
    });

    const timeslots = document.querySelectorAll(".timeslot");

    timeslots.forEach(function (slot) {
        slot.addEventListener("click", function () {
            if (focusedActivity) {
                const colorBox = focusedActivity.querySelector('.activity-color-box');
                const activityColor = colorBox.style.backgroundColor;

                // Toggle behavior: if slot is already colored with the focused activity's color, remove it
                if (slot.style.backgroundColor === activityColor) {
                    slot.style.backgroundColor = "";
                    
                    if (activityCellMap.has(focusedActivity)) {
                        activityCellMap.get(focusedActivity).delete(slot);
                    }
                    
                    // Remove from cell-to-activity mapping
                    cellActivityMap.delete(slot);
                } else {
                    // NEW: Check if slot is already assigned to another activity
                    if (cellActivityMap.has(slot)) {
                        const previousActivity = cellActivityMap.get(slot);
                        if (previousActivity !== focusedActivity) {
                            // Remove this cell from the previous activity's set
                            if (activityCellMap.has(previousActivity)) {
                                activityCellMap.get(previousActivity).delete(slot);
                            }
                        }
                    }
                    
                    // Set the new color
                    slot.style.backgroundColor = activityColor;
                    
                    // Add to the focused activity's cell set
                    if (!activityCellMap.has(focusedActivity)) {
                        activityCellMap.set(focusedActivity, new Set());
                    }
                    activityCellMap.get(focusedActivity).add(slot);
                    
                    // Update cell-to-activity mapping
                    cellActivityMap.set(slot, focusedActivity);
                }
            } else {
                // Handle availability toggling based on the current state
                const isAvailable = slot.classList.toggle('available');
                updateAvailability(slot, isAvailable, availabilityState === false);
            }
        });
    });

    document.getElementById('add-button').addEventListener('click', () => addActivity());
    
    // Load saved activities after DOM is loaded
    loadSavedActivities();
});


function collectTimetableData() {
    const data = [];
    const activityColors = {}; // Store colors for each activity
    
    activityCellMap.forEach((cellSet, activityBox) => {
        const activityName = activityBox.querySelector('.activity-text').textContent.trim();
        const colorBox = activityBox.querySelector('.activity-color-box');
        const activityColor = colorBox.style.backgroundColor;
        
        // Store the color for this activity
        activityColors[activityName] = rgbToHex(activityColor);
        
        cellSet.forEach(cell => {
            const colIndex = cell.cellIndex;
            const rowIndex = cell.parentElement.rowIndex;
            const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][colIndex - 1];
            const startTime = cell.parentElement.cells[0].textContent.trim();
            const endRow = cell.parentElement.nextElementSibling;
            const endTime = endRow ? endRow.cells[0].textContent.trim() : startTime;
            const availability = cell.classList.contains('available') ? true : false;

            data.push({
                activity_number: activityName,
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                color: rgbToHex(activityColor), // Add color information
                full_availability: availability
            });
        });
    });
    return data;
}

// Helper function to convert RGB to Hex
function rgbToHex(rgb) {
    // Check if rgb is already a hex color
    if (rgb.startsWith('#')) {
        return rgb;
    }
    
    // Extract RGB values
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) {
        return '#000000'; // Default black if format is invalid
    }
    
    // Convert to hex
    return '#' + rgbValues.map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Function to save the timetable to the server
function saveTimeTable(showAlert = false) {
    const activityData = collectTimetableData();
    return fetch('/save_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activityData }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (showAlert) {
            if (data.status === 'success') {
                alert('Timetable saved successfully!');
            } else {
                alert('Error saving timetable: ' + (data.error || 'Unknown error'));
            }
        }
        return data;
    })
    .catch(error => {
        if (showAlert) {
            alert('Request failed: ' + error);
        }
        console.error('Save timetable error:', error);
        return { status: 'error', error: error.message };
    });
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('save-timetable').addEventListener('click', () => {
        saveTimeTable(true); // Pass true to show alerts
    });
});