// Store assessments data grouped by unit
const assessmentsData = {};

// Initialize assessments data once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    const unitOptions = document.querySelectorAll('#UnitSelect option');
    unitOptions.forEach(opt => {
        const unit = opt.value;
        // Load saved assessments if available, else empty array
        assessmentsData[unit] = window.savedAssessments?.[unit] || [];
    });
    // Re-render assessments when a new unit is selected
    document.getElementById('UnitSelect').addEventListener('change', renderAssessments);
    renderAssessments();
});

//units.forEach(unit => assessmentsData[unit]=[]);
// Add a new blank assessment entry for the selected unit
function addAssessment(){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit].push({name: '', scoreObtained: '', scoreTotal: '', weightage: ''});
    renderAssessments();
}
// Update a field value for an existing assessment
function updateAssessment(idx, field, value){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit][idx][field] = value;
    renderSummary();
}
// Remove an assessment entry by index
function removeAssessment(idx){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit].splice(idx, 1);
    renderAssessments();
}
// Render the assessment input form and summary table
function renderAssessments() {
    const unit = document.getElementById('UnitSelect').value;
    const container = document.getElementById('assessmentsContainer');
    container.innerHTML = '';
    // Form row to input a new assessment
    const row = document.createElement('div');
    row.className = 'row mb-2';
    row.innerHTML = `
        <div class="col">
            <input type="text" placeholder="Assessment Name" class="form-control" id="assessmentName">
            <div id="nameError" class="text-danger small mt-1"></div>
        </div>
        <div class="col">
            <input type="number" placeholder="Obtained Score" class="form-control" id="assessmentScoreObtained" min="0" max="100" step="any">
            <div id="obtainedError" class="text-danger small mt-1"></div>
        </div>
        <div class="col">
            <input type="number" placeholder="Total Score" class="form-control" id="assessmentScoreTotal" min="0.01" max="100" step="any">
            <div id="totalError" class="text-danger small mt-1"></div>
        </div>
        <div class="col">
            <input type="number" placeholder="Weightage (%)" class="form-control" id="assessmentWeightage" min="0" max="100" step="any">
            <div id="weightError" class="text-danger small mt-1"></div>
        </div>
    `;
    container.appendChild(row);

    renderSummary();
}
// Render the summary table showing all assessments for the selected unit
function renderSummary(){
    const unit = document.getElementById('UnitSelect').value;
    const summaryDiv = document.getElementById('summary');
    const assessments = assessmentsData[unit];

    if (!assessments.length){
        summaryDiv.innerHTML = '<em>No assessments available</em>';
        return;
    }
    // Build the HTML table
    let html = `<table class="assessment-table"><thead><tr>
        <th>Name</th>
        <th>Score</th>
        <th>Assessment Weight %</th>
        <th>Obtained Weight %</th>
        <th></th>
    </tr></thead><tbody id="assessment-tbody">`;
    assessments.forEach((a, idx) => {
        const obtained = parseFloat(a.scoreObtained);
        const total = parseFloat(a.scoreTotal);
        const weight = parseFloat(a.weightage);
        let weighted = '-';
        if (!isNaN(obtained) && !isNaN(total) && total > 0) {
          weighted = ((obtained / total) * weight).toFixed(2) + '%';
        }
        // Render table row with edit/delete buttons
        html += `<tr class="assessment-row" draggable="true" data-index="${idx}">
          <td>${a.name || '-'}</td>
          <td>${!isNaN(obtained) ? obtained : '-'} / ${!isNaN(total) ? total : '-'}</td>
          <td>${!isNaN(weight) ? weight : 0}%</td>
          <td>${weighted}</td>
          <td class="icon-cell">
            <button class="edit-btn" onclick="editAssessment(${idx})" title="Edit assessment">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="delete-btn" onclick="deleteAssessment(${idx})" title="Delete activity">
                <img src="https://cdn-icons-png.flaticon.com/512/1214/1214428.png" alt="Delete" class="delete-icon" style="width: 20px; height: 20px;" />
            </button>
          </td>
        </tr>`;
      });
      
      html += '</tbody></table>';
      summaryDiv.innerHTML = html;
      // Enable drag-and-drop functionality
      enableDragAndDrop();
}

// Enable drag-and-drop to reorder assessments
function enableDragAndDrop() {
    const tbody = document.getElementById("assessment-tbody");
    let dragStartIndex;

    tbody.querySelectorAll("tr").forEach(row => {
        row.addEventListener("dragstart", (e) => {
            dragStartIndex = +row.dataset.index;
            row.classList.add('dragging');
        });

        row.addEventListener("dragover", (e) => {
            e.preventDefault();
            row.classList.add('drag-over');
        });

        row.addEventListener("dragleave", () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener("drop", () => {
            row.classList.remove('drag-over');
            const dropIndex = +row.dataset.index;
            moveAssessmentByDrag(dragStartIndex, dropIndex);
        });

        row.addEventListener("dragend", () => {
            row.classList.remove('dragging');
        });
    });
}
// Move assessment from one index to another (reordering)
function moveAssessmentByDrag(fromIdx, toIdx) {
    const unit = document.getElementById('UnitSelect').value;
    const list = assessmentsData[unit];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    window.savedAssessments[unit] = list;

    // Save the new order to the backend
    const order = list.map(a => a.name);
    safeFetch('/assessments/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit, order })
    });

    renderSummary();
}
// Validate and submit a new assessment entry
function saveAssessments() {
    const nameInput = document.getElementById('assessmentName');
    const obtainedInput = document.getElementById('assessmentScoreObtained');
    const totalInput = document.getElementById('assessmentScoreTotal');
    const weightInput = document.getElementById('assessmentWeightage');

    const name = nameInput.value.trim();
    const scoreObtained = parseFloat(obtainedInput.value);
    const scoreTotal = parseFloat(totalInput.value);
    const weightage = parseFloat(weightInput.value);

    // Reset validation messages
    document.getElementById('nameError').textContent = '';
    document.getElementById('obtainedError').textContent = '';
    document.getElementById('totalError').textContent = '';
    document.getElementById('weightError').textContent = '';

    let hasError = false;
    // Validate all inputs
    if (!name) {
        document.getElementById('nameError').textContent = 'Assessment name is required.';
        hasError = true;
    }
    if (isNaN(scoreObtained) || scoreObtained < 0 || scoreObtained > 100) {
        document.getElementById('obtainedError').textContent = 'Score must be between 0 and 100.';
        hasError = true;
    }
    if (isNaN(scoreTotal) || scoreTotal <= 0 || scoreTotal > 100) {
        document.getElementById('totalError').textContent = 'Total must be between 0 and 100.';
        hasError = true;
    }
    if (isNaN(weightage) || weightage < 0 || weightage > 100) {
        document.getElementById('weightError').textContent = 'Weightage must be between 0 and 100.';
        hasError = true;
    }

    if (hasError) return;

    const unit = document.getElementById('UnitSelect').value;
    const newAssessment = { name, scoreObtained, scoreTotal, weightage };
    // Save to server
    safeFetch('/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessments: { [unit]: [newAssessment] } })
    })
    .then(res => res.json())
    .then(data => {
        alert("Assessment saved successfully!");
        if (!window.savedAssessments[unit]) {
            window.savedAssessments[unit] = [];
        }
        window.savedAssessments[unit].push(newAssessment);
        renderSummary();
        // Clear the input form
        nameInput.value = '';
        obtainedInput.value = '';
        totalInput.value = '';
        weightInput.value = '';
    })
    .catch(err => alert("Error saving assessment"));
}
// Delete an assessment from local state and server
function deleteAssessment(idx) {
    const unit = document.getElementById('UnitSelect').value;
    const toDelete = assessmentsData[unit][idx];

    safeFetch('/assessments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            unit: unit,
            name: toDelete.name
        }),
    })
    .then(res => res.json())
    .then(data => {
        // Remove locally only if server deletion succeeded
        if (data.status === 'success') {
            assessmentsData[unit].splice(idx, 1);
            window.savedAssessments[unit] = assessmentsData[unit];
            renderSummary();
        }
    })
    .catch(err => alert("Error deleting assessment"));
}
// Turn a row into editable fields for modification
function editAssessment(idx) {
    const unit = document.getElementById('UnitSelect').value;
    const a = assessmentsData[unit][idx];
    
    const summaryDiv = document.getElementById('summary');
    const table = summaryDiv.querySelector('.assessment-table');
    const row = table.querySelectorAll('tbody tr')[idx];
  
    row.innerHTML = `
      <td><input type="text" value="${a.name}" id="edit-name-${idx}" /></td>
      <td>
        <input type="number" min="0" value="${a.scoreObtained}" id="edit-obtained-${idx}" min="0" style="width: 45px;" /> /
        <input type="number" min="0" value="${a.scoreTotal}" id="edit-total-${idx}" min="0" style="width: 45px;" />
      </td>
      <td><input type="number" min="0" max="100" value="${a.weightage}" id="edit-weight-${idx}" min="0" style="width: 60px;" />%</td>
      <td>--</td>
      <td class="icon-cell">
        <button onclick="saveEdit(${idx})" title="Save"><i class="fa-solid fa-check"></i></button>
      </td>
    `;
}
// Save edited data and persist to server
function saveEdit(idx) {
    const unit = document.getElementById('UnitSelect').value;
    const oldName = assessmentsData[unit][idx].name;  // in case name was edited
    const updated = {
        name: document.getElementById(`edit-name-${idx}`).value,
        scoreObtained: parseFloat(document.getElementById(`edit-obtained-${idx}`).value),
        scoreTotal: parseFloat(document.getElementById(`edit-total-${idx}`).value),
        weightage: parseFloat(document.getElementById(`edit-weight-${idx}`).value),
    };

    // Update backend and UI
    safeFetch('/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            unit: unit,
            name: oldName,
            new_data: updated
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            // update local copy & re-render
            assessmentsData[unit][idx] = updated;
            window.savedAssessments[unit] = assessmentsData[unit];
            renderSummary();
        } else {
            alert("Error updating assessment: " + (data.message || ''));
        }
    });
}
// Get the current order of assessments from the DOM
function getAssessmentOrder() {
    const rows = document.querySelectorAll('.assessment-row');
    return Array.from(rows).map(row => row.dataset.index);  // Make sure to assign `data-index=idx` on each row
}