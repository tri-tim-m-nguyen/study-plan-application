document.addEventListener("DOMContentLoaded", function () {
    const timeslots = document.querySelectorAll(".timeslot");
    const eventsContainer = document.getElementById("events");
    const addEventForm = document.getElementById("add-event-form");
    const eventInput = document.getElementById("event");
    let toggleMode = null;
    let activeEvent = null;

    // Pool of available toggle numbers
    const availableToggles = Array.from({ length: 10 }, (_, i) => i + 1); // [1, 2, ..., 10]

    // Handle the "Add Event" form submission
    addEventForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const eventString = eventInput.value.trim();

        if (eventString) {
            if (availableToggles.length === 0) {
                alert("You can only have up to 10 events at once.");
                return;
            }

            // Get the next available toggle number
            const toggleNumber = availableToggles.shift(); // Remove the first available toggle number
            const toggleClass = `toggle-${toggleNumber}`; // Unique class for this event

            // Create a new event in the Event section
            const event = document.createElement("div");
            event.className = `event mb-2 p-2 border d-flex justify-content-between align-items-center`; // Default .event class
            event.innerHTML = `
                <span>${eventString}</span>
                <button class="btn btn-sm btn-danger delete-event">Delete</button>
            `;

            // When event is clicked, set it as active
            event.addEventListener("click", function () {
                // Reset the previous active event
                if (activeEvent) {
                    activeEvent.classList.remove(`event-${toggleMode}`); // Remove toggle class from previous active event
                    activeEvent.classList.add("event"); // Reset to default .event class
                }

                // Set the current event box as active
                toggleMode = toggleClass;
                event.classList.remove("event"); // Remove default .event class
                event.classList.add(`event-${toggleClass}`); // Add the toggle class
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
                    }
                });

                // Reset active event if the deleted box was active
                if (activeEvent === event) {
                    activeEvent = null;
                    toggleMode = null;
                }

                // Return the toggle number to the pool
                availableToggles.push(toggleNumber);
                availableToggles.sort((a, b) => a - b); // Keep the pool sorted

                // Unhide the form if there are available toggles
                if (availableToggles.length > 0) {
                    addEventForm.style.display = "block";
                }
            });

            eventsContainer.appendChild(event);
            eventInput.value = "";

            // Hide the form if no toggles are available
            if (availableToggles.length === 0) {
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
                } else {
                    slot.className = "timeslot";
                    slot.classList.add(toggleMode); // Add the toggle class to the timeslot
                }
            }
        });
    });
});