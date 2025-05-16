let availabilityState = null; // Track the availability state

// create.js - Specific JavaScript for create.html page
document.addEventListener('DOMContentLoaded', function () {

    // Event listeners for toggling fully available and partially available parameters.
    const fullyAvailableToggle = document.getElementById('toggle-Available');
    const partiallyAvailableToggle = document.getElementById('toggle-pAvailable');

    fullyAvailableToggle.addEventListener('click', () => {
        if (availabilityState === "full") {
            // Deselect if already selected
            availabilityState = null;
            fullyAvailableToggle.classList.remove('active');
            fullyAvailableToggle.style.backgroundColor = "";
        } else {
            // Select this toggle
            availabilityState = "full";
            fullyAvailableToggle.classList.add('active');
            fullyAvailableToggle.style.backgroundColor = "green";

            // Deselect the other toggle
            partiallyAvailableToggle.classList.remove('active');
            partiallyAvailableToggle.style.backgroundColor = "";

            // Unselect any focused activity
            if (focusedActivity) {
                focusedActivity.classList.remove('focused');
                focusedActivity = null;
            }
        }
    });

    partiallyAvailableToggle.addEventListener('click', () => {
        if (availabilityState === "partial") {
            // Deselect if already selected
            availabilityState = null;
            partiallyAvailableToggle.classList.remove('active');
            partiallyAvailableToggle.style.backgroundColor = "";
        } else {
            // Select this toggle
            availabilityState = "partial";
            partiallyAvailableToggle.classList.add('active');
            partiallyAvailableToggle.style.backgroundColor = "gold";

            // Deselect the other toggle
            fullyAvailableToggle.classList.remove('active');
            fullyAvailableToggle.style.backgroundColor = "";

            // Unselect any focused activity
            if (focusedActivity) {
                focusedActivity.classList.remove('focused');
                focusedActivity = null;
            }
        }
    });

    // Initialize activity creation and timetable selection functionality
    const timeslots = document.querySelectorAll(".timeslot");
    const addButton = document.getElementById('add-button');
    const saveButton = document.getElementById('save-timetable');

    // Set up cell click handler
    timeslots.forEach(function (slot) {
        slot.addEventListener("click", function () {
            if (focusedActivity) {
                const colorBox = focusedActivity.querySelector('.activity-color-box');
                const activityColor = colorBox.style.backgroundColor;

                // Toggle behavior: if slot is already colored with the focused activity's color, remove it
                if (slot.style.backgroundColor === activityColor) {
                    slot.classList.remove('full', 'partial');
                    slot.style.backgroundColor = "";
                    
                    if (activityCellMap.has(focusedActivity)) {
                        activityCellMap.get(focusedActivity).delete(slot);
                    }
                    
                    // Remove from cell-to-activity mapping
                    cellActivityMap.delete(slot);
                } else {
                    // Check if slot is already assigned to another activity
                    if (cellActivityMap.has(slot)) {
                        const previousActivity = cellActivityMap.get(slot);
                        if (previousActivity !== focusedActivity) {
                            // Remove this cell from the previous activity's set
                            if (activityCellMap.has(previousActivity)) {
                                activityCellMap.get(previousActivity).delete(slot);
                            }
                        }
                    }
                    
                    // Assign slot to current activity
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

            } else if (availabilityState === "full") {
                // If fullyAvailable is selected, set the timeslot to green
                if (slot.classList.contains("full")) {
                    slot.classList.remove("full");
                    slot.dataset.availability = ""; // Clear availability
                } else {
                    slot.classList.add("full");
                    slot.classList.remove("partial"); // Ensure only one class is active
                    slot.dataset.availability = "full"; // Set availability to full
                }
            } else if (availabilityState === "partial") {
                // If partiallyAvailable is selected, set the timeslot to gold
                if (slot.classList.contains("partial")) {
                    slot.classList.remove("partial");
                    slot.dataset.availability = ""; // Clear availability
                } else {
                    slot.classList.add("partial");
                    slot.classList.remove("full"); // Ensure only one class is active
                    slot.dataset.availability = "partial"; // Set availability to partial
                }
            }
        });
    });

    // Add activity when "+" button is clicked
    // Add button click handler
    if (addButton) {
        addButton.addEventListener('click', () => {
            addActivity(); // Default is 'normal'
        });
    }
    
    // Save button click handler
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveTimeTable(true); // Pass true to show alerts
        });
    }
    
    // Load saved activities after DOM is loaded
    loadSavedActivities();
});

/**
 * Adds a new activity block to the UI.
 * Supports two types: 'normal' and 'unit'.
 */
function addActivity(name = null, color = null, type = 'normal') {
    if (activityCount >= 10) return null;

    if (type === 'unit' && unitCount >= 4){
        alert("You can create up to 4 units as activities.");
        return null;
    }

    activityCount += 1;
    if (type === 'unit') {
        unitCount += 1;
    }
    const activityId = name || 'Activity' + activityCount;

    const activityBox = document.createElement('div');
    activityBox.classList.add('activity-box');
    activityBox.dataset.activityName = activityId;
    activityBox.dataset.activityType = type; // Stores the type of activity

    // Delete icon for removing an activity
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

        //Record of unit activity created
        if (activityBox.dataset.activityType === 'unit') {
            unitCount -= 1;
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
    // Editable activity name
    const activityText = document.createElement('div');
    activityText.className = 'activity-text';
    activityText.contentEditable = false;
    activityText.textContent = activityId;

    // Dropdown to select activity type (normal/unit)
    const typeSelector = document.createElement('select');
    typeSelector.className = 'form-select form-select-sm';
    typeSelector.style.width = '90px';

    ['normal', 'unit'].forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.text = type.charAt(0).toUpperCase() + type.slice(1);
        typeSelector.appendChild(opt);
    });

    typeSelector.value = type;
    activityBox.dataset.activityType = type;

    typeSelector.addEventListener('change', () => {
        const unitCount = document.querySelectorAll('.activity-box select option:checked[value="unit"]').length;
        if (typeSelector.value === 'unit' && unitCount > 4) {
            alert('Maximum 4 unit activities allowed');
            typeSelector.value = 'normal';
        }
        activityBox.dataset.activityType = typeSelector.value;  
    });
    // Color box and input
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

    const fullyAvailableToggle = document.getElementById('toggle-Available');
    const partiallyAvailableToggle = document.getElementById('toggle-pAvailable');
    // Focus on activity box on click
    activityBox.addEventListener('click', (e) => {
        // Prevent triggering when clicking on delete icon, color box or color input
        if (e.target === deleteIcon || e.target === colorBox || e.target === colorInput) return;
        
        if (focusedActivity === activityBox) {
            // Remove focus if clicked again
            focusedActivity = null;
            activityBox.classList.remove('focused');
        } else {
            availabilityState = null;
            fullyAvailableToggle.classList.remove('active');
            fullyAvailableToggle.style.backgroundColor = "";
            partiallyAvailableToggle.classList.remove('active');
            partiallyAvailableToggle.style.backgroundColor = "";
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
    // Add activity to DOM
    activityBox.appendChild(activityText);
    activityBox.appendChild(deleteIcon);
    activityBox.appendChild(typeSelector);
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

/**
 * Load previously saved activities (from database) and recreate them on screen.
 */
// Function to load saved activities from database
function loadSavedActivities() {
    // Use window.userSavedActivities instead of savedActivities
    if (typeof window.userSavedActivities === 'undefined' || !Array.isArray(window.userSavedActivities) || window.userSavedActivities.length === 0) {
        return;
    }
    
    // Group time slots by activity
    const activitiesMap = {};
    window.userSavedActivities.forEach(slot => {
        if (slot.activity_id === 0) {
            // Render full or partial timeslots directly
            const cell = findCell(slot.day_of_week, slot.start_time);
            if (cell) {
                if (slot.activity_number === "full") {
                    cell.classList.add('full'); 
                    cell.dataset.availability = "full";
                } else if (slot.activity_number === "partial") {
                    cell.classList.add('partial'); 
                    cell.dataset.availability = "partial";
                }
            }
        } else {
            if (!activitiesMap[slot.activity_number]) {
                activitiesMap[slot.activity_number] = {
                    slots: [],
                    color: slot.color || getRandomColor(), // Use saved color if available, else random
                    type:slot.activity_type || 'normal'
                };
            }
            activitiesMap[slot.activity_number].slots.push(slot);
        }
    });
    
    // Create activities and populate cells
    for (const [actName, actData] of Object.entries(activitiesMap)) {
        const activityBox = addActivity(actName, actData.color, actData.type);
        
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
                // Track which activity owns this cell
                cellActivityMap.set(cell, activityBox);
            }
        });
    }
}
/**
 * Gather all activity + time slot mappings into an array for saving to backend.
 */
function collectTimetableData() {
    const data = [];
    const activityColors = {}; // Store colors for each activity
    
    activityCellMap.forEach((cellSet, activityBox) => {
        const activityName = activityBox.querySelector('.activity-text').textContent.trim();
        const colorBox = activityBox.querySelector('.activity-color-box');
        const activityColor = colorBox.style.backgroundColor;
        const activityType = activityBox.dataset.activityType || 'normal';
        
        // Store the color for this activity
        activityColors[activityName] = rgbToHex(activityColor);
        
        cellSet.forEach(cell => {
            const colIndex = cell.cellIndex;
            const rowIndex = cell.parentElement.rowIndex;
            const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][colIndex - 1];
            const startTime = cell.parentElement.cells[0].textContent.trim();
            const endRow = cell.parentElement.nextElementSibling;
            const endTime = endRow ? endRow.cells[0].textContent.trim() : startTime;

            data.push({
                activity_number: activityName,
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                color: rgbToHex(activityColor), // Add color information
                activity_type: activityType
            });
        });
    });

     // Add timeslots with "full" or "partial" availability
    document.querySelectorAll('.timeslot').forEach(cell => {
        const availability = cell.dataset.availability; // Check the availability field
        if (availability === "full" || availability === "partial") {
            const colIndex = cell.cellIndex;
            const rowIndex = cell.parentElement.rowIndex;
            const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][colIndex - 1];
            const startTime = cell.parentElement.cells[0].textContent.trim();
            const endRow = cell.parentElement.nextElementSibling;
            const endTime = endRow ? endRow.cells[0].textContent.trim() : startTime;

            data.push({
                activity_number: availability, // Set activity name to "full" or "partial"
                activity_id: 0, // Set activity ID to 0
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                color: null, // No color for full/partial availability
            });
        }
    });

    return data;
}

// Function to save the timetable to the server
function saveTimeTable(showAlert = false) {
    const activityData = collectTimetableData();
    return safeFetch('/save_timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activityData }),
    })
    .then(response => response.json())
    .then(data => {
        if (showAlert) {
            if (data.status === 'success') {
                alert('Timetable saved successfully!');
                
                // After successful save, update saved assessments to reflect deleted units
                const activeUnits = new Set();
                activityCellMap.forEach((cellSet, activityBox) => {
                    if (activityBox.dataset.activityType === 'unit') {
                        const activityName = activityBox.querySelector('.activity-text').textContent.trim();
                        activeUnits.add(activityName);
                    }
                });
                
                // Clean up the savedAssessments for units that no longer exist
                if (window.savedAssessments) {
                    Object.keys(window.savedAssessments).forEach(unit => {
                        if (!activeUnits.has(unit)) {
                            delete window.savedAssessments[unit];
                        }
                    });
                }
                
                // If we're on the assessments page with the proper functions
                const assessmentsModule = window.assessmentsData || null;
                const renderFn = window.renderAssessments || null;
                
                if (document.getElementById('UnitSelect') && typeof renderFn === 'function' && assessmentsModule) {
                    // Update the assessments data structure
                    Object.keys(assessmentsModule).forEach(unit => {
                        if (!activeUnits.has(unit)) {
                            assessmentsModule[unit] = [];
                        }
                    });
                    
                    // Call the render function from assessment.js
                    renderFn();
                }
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