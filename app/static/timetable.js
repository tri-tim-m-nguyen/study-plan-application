document.addEventListener("DOMContentLoaded", function () {
    const timeslots = document.querySelectorAll(".timeslot");
    let toggleMode = "selected"; // Default mode
    toggleSelectedButton.classList.add("active");

    const toggleSelectedButton = document.getElementById("toggle-selected");
    const togglePSelectedButton = document.getElementById("toggle-pselected");

    // Add event listeners to the buttons
    toggleSelectedButton.addEventListener("click", function () {
        toggleMode = "selected";
        toggleSelectedButton.classList.add("active");
        togglePSelectedButton.classList.remove("active");
    });

    togglePSelectedButton.addEventListener("click", function () {
        toggleMode = "pselected";
        togglePSelectedButton.classList.add("active");
        toggleSelectedButton.classList.remove("active");
    });

    // Add click event listeners to timeslots
    timeslots.forEach(function (slot) {
        slot.addEventListener("click", function () {
            if (toggleMode === "selected") {
                slot.classList.toggle("selected");
                slot.classList.remove("pselected"); // Ensure only one mode is active
            } else if (toggleMode === "pselected") {
                slot.classList.toggle("pselected");
                slot.classList.remove("selected"); // Ensure only one mode is active
            }
        });
    });
});