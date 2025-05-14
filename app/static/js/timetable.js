// Shared timetable functionality
let activityCount = 0;
let focusedActivity = null;
let unitCount = 0;

// Store activity-to-cells mapping
const activityCellMap = new Map();
// Store cell-to-activity mapping to track which activity owns each cell
const cellActivityMap = new Map();

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
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

// Initialize toggle buttons
document.addEventListener('DOMContentLoaded', function () {
    // Set up toggle buttons for all pages that use timetable
    const toggleButtons = document.querySelectorAll('.toggle');
    if (toggleButtons) {
        toggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });
    }
});