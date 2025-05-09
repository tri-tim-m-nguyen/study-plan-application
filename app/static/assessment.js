const assessmentsData = {};

document.addEventListener('DOMContentLoaded', function () {
    const unitOptions = document.querySelectorAll('#UnitSelect option');
    unitOptions.forEach(opt => {
        const unit = opt.value;
        assessmentsData[unit] = window.savedAssessments?.[unit] || [];
    });

    document.getElementById('UnitSelect').addEventListener('change', renderAssessments);
    renderAssessments();
});

//units.forEach(unit => assessmentsData[unit]=[]);

function addAssessment(){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit].push({name: '', scoreObtained: '', scoreTotal: '', weightage: ''});
    renderAssessments();
}
function updateAssessment(idx, field, value){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit][idx][field] = value;
    renderSummary();
}
function removeAssessment(idx){
    const unit = document.getElementById('UnitSelect').value;
    assessmentsData[unit].splice(idx, 1);
    renderAssessments();
}
function renderAssessments() {
    const unit = document.getElementById('UnitSelect').value;
    const container = document.getElementById('assessmentsContainer');
    container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'row mb-2';
    row.innerHTML = `
        <div class="col">
            <input type="text" placeholder="Assessment Name" class="form-control" id="assessmentName">
        </div>
        <div class="col">
            <input type="number" placeholder="Obtained Score" class="form-control" id="assessmentScoreObtained" min="0">
        </div>
        <div class="col">
            <input type="number" placeholder="Total Score" class="form-control" id="assessmentScoreTotal" min="0">
        </div>
        <div class="col">
            <input type="number" placeholder="Weightage (%)" class="form-control" id="assessmentWeightage" min="0" max="100">
        </div>
    `;
    container.appendChild(row);

    renderSummary();
}
function renderSummary(){
    const unit = document.getElementById('UnitSelect').value;
    const summaryDiv = document.getElementById('summary');
    const assessments = assessmentsData[unit];

    if (!assessments.length){
        summaryDiv.innerHTML = '<em>No assessments available</em>';
        return;
    }
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
      
        html += `<tr class="assessment-row" draggable="true" data-index="${idx}">
          <td>${a.name || '-'}</td>
          <td>${!isNaN(obtained) ? obtained : '-'} / ${!isNaN(total) ? total : '-'}</td>
          <td>${!isNaN(weight) ? weight : 0}%</td>
          <td>${weighted}</td>
          <td class="icon-cell">
            <button class="edit-btn" onclick="editAssessment(${idx})" title="Edit assessment">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="delete-btn" onclick="deleteAssessment(${idx})" title="Delete assessment">
                <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`;
      });
      
      html += '</tbody></table>';
      summaryDiv.innerHTML = html;
      enableDragAndDrop();
}

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

function moveAssessmentByDrag(fromIdx, toIdx) {
    const unit = document.getElementById('UnitSelect').value;
    const list = assessmentsData[unit];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    window.savedAssessments[unit] = list;

    // Persist to backend
    const order = list.map(a => a.name);
    fetch('/assessments/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ unit, order })
    });

    renderSummary();
}

function saveAssessments() {
    const unit = document.getElementById('UnitSelect').value;

    const newAssessment = {
        name: document.getElementById('assessmentName').value,
        scoreObtained: parseFloat(document.getElementById('assessmentScoreObtained').value),
        scoreTotal: parseFloat(document.getElementById('assessmentScoreTotal').value),
        weightage: parseFloat(document.getElementById('assessmentWeightage').value)
    };

    fetch('/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessments: { [unit]: [newAssessment] } }),
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        alert("Assessment saved successfully!");
        // Update local data so it's rendered in summary
        if (!window.savedAssessments[unit]) {
            window.savedAssessments[unit] = [];
        }
        window.savedAssessments[unit].push(newAssessment);
        renderSummary();
        // Optionally clear the form
        document.getElementById('assessmentName').value = '';
        document.getElementById('assessmentScoreObtained').value = '';
        document.getElementById('assessmentScoreTotal').value = '';
        document.getElementById('assessmentWeightage').value = '';
    })
    .catch(err => alert("Error saving assessment"));
}

function deleteAssessment(idx) {
    const unit = document.getElementById('UnitSelect').value;
    const toDelete = assessmentsData[unit][idx];

    fetch('/assessments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            unit: unit,
            name: toDelete.name
        }),
        credentials: 'include'
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

function saveEdit(idx) {
    const unit = document.getElementById('UnitSelect').value;
    const oldName = assessmentsData[unit][idx].name;  // in case name was edited
    const updated = {
        name: document.getElementById(`edit-name-${idx}`).value,
        scoreObtained: parseFloat(document.getElementById(`edit-obtained-${idx}`).value),
        scoreTotal: parseFloat(document.getElementById(`edit-total-${idx}`).value),
        weightage: parseFloat(document.getElementById(`edit-weight-${idx}`).value),
    };

    // Update DB
    fetch('/assessments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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

function getAssessmentOrder() {
    const rows = document.querySelectorAll('.assessment-row');
    return Array.from(rows).map(row => row.dataset.index);  // Make sure to assign `data-index=idx` on each row
}