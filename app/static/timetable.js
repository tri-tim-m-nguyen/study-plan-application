document.addEventListener("DOMContentLoaded", function () {
    const timeslots = document.querySelectorAll(".timeslot");
    const eventsContainer = document.getElementById("events");
    const addEventForm = document.getElementById("add-event-form");
    const eventInput = document.getElementById("event");
    let toggleMode = null;
    let eventCounter = 0;
    let activeEvent = null;

    // List of all possible colors
    const allColors = [
        "red", "blue", "green", "yellow", "purple",
        "orange", "pink", "brown", "cyan", "lime"
    ];
    let availableColors = [...allColors]; // Clone the list of all colors
    let usedColors = {}; // Map to track used colors by toggle class

    // Handle the "Add Event" form submission
    addEventForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const eventString = eventInput.value.trim();

        if (eventString) {
            if (availableColors.length === 0) {
                alert("No more colors available. Please delete an event to free up a color.");
                return;
            }

            eventCounter++;
            const toggleClass = `toggle-${eventCounter}`; // Unique class for this event
            const toggleColor = availableColors.shift(); // Get the first available color

            // Track the used color
            usedColors[toggleClass] = toggleColor;

            // Create a new event in the Event section
            const event = document.createElement("div");
            event.className = `event mb-2 p-2 border d-flex justify-content-between align-items-center ${toggleClass}`;
            event.style.backgroundColor = "#f8f9fa"; // Default grey background for event box
            event.innerHTML = `
                <span>${eventString}</span>
                <button class="btn btn-sm btn-danger delete-event">Delete</button>
            `;

            // When event is clicked, set it as active
            event.addEventListener("click", function () {
                // Reset the previous active event to default color
                if (activeEvent) {
                    activeEvent.style.backgroundColor = "#f8f9fa"; // Reset to default grey
                    activeEvent.style.color = "#000"; // Reset text color to black
                }

                // Set the current event box as active
                toggleMode = toggleClass;
                event.style.backgroundColor = toggleColor; // Set background color to the toggle color
                event.style.color = "#fff"; // Set text color to white
                activeEvent = event;
            });

            // Delete event when delete button is clicked
            const deleteButton = event.querySelector(".delete-event");
            deleteButton.addEventListener("click", function (e) {
                e.stopPropagation(); // Prevent triggering the event box click
                event.remove();

                // Reset all timeslots associated with this toggle
                timeslots.forEach(function (slot) {
                    if (slot.classList.contains(toggleClass)) {
                        slot.className = "timeslot"; // Reset to default class
                        slot.style.backgroundColor = ""; // Reset background color
                    }
                });

                // Reset active event if the deleted box was active
                if (activeEvent === event) {
                    activeEvent = null;
                    toggleMode = null;
                }

                // Return the color to the available pool
                availableColors.push(usedColors[toggleClass]);
                delete usedColors[toggleClass]; // Remove the color from the used map

                // Decrement the event counter
                eventCounter--;

                // Show the form again if the event count is below the limit
                if (eventCounter < 10) {
                    addEventForm.style.display = "block";
                }
            });

            eventsContainer.appendChild(event);
            eventInput.value = "";

            // Hide the form if the event count reaches the limit
            if (eventCounter >= 10) {
                addEventForm.style.display = "none";
            }
        } else {
            alert("Please enter a valid string.");
        }
    });

    // Add click event listeners to timeslots
    timeslots.forEach(function (slot) {
        slot.addEventListener("click", function () {
            if (toggleMode) {
                // Resets to default if already toggled to selected event
                if (slot.classList.contains(toggleMode)) {
                    slot.className = "timeslot";
                    slot.style.backgroundColor = ""; // Reset background color
                } else {
                    slot.className = "timeslot";
                    slot.classList.add(toggleMode); // Add the toggle class to the timeslot
                    slot.style.backgroundColor = usedColors[toggleMode]; // Set background color to toggle color
                }
            }
        });
    });
});