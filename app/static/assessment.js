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

units.forEach(unit => assessmentsData[unit]=[]);

document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('UnitSelect').addEventListener('change', renderAssessments);
    renderAssessments();
})
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
            <input type="number" placeholder="Obtained Score" class="form-control" id="assessmentScoreObtained">
        </div>
        <div class="col">
            <input type="number" placeholder="Total Score" class="form-control" id="assessmentScoreTotal">
        </div>
        <div class="col">
            <input type="number" placeholder="Weightage (%)" class="form-control" id="assessmentWeightage">
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
    </tr></thead></tbody>`;
    assessments.forEach((a, idx) => {
        const obtained = parseFloat(a.scoreObtained);
        const total = parseFloat(a.scoreTotal);
        const weight = parseFloat(a.weightage);
        let weighted = '-';
      
        if (!isNaN(obtained) && !isNaN(total) && total > 0) {
          weighted = ((obtained / total) * weight).toFixed(2) + '%';
        }
      
        html += `<tr>
          <td>${a.name || '-'}</td>
          <td>${!isNaN(obtained) ? obtained : '-'} / ${!isNaN(total) ? total : '-'}</td>
          <td>${!isNaN(weight) ? weight : 0}%</td>
          <td>${weighted}</td>
          <td class="icon-cell">
            <button onclick="deleteAssessment(${idx})" title="Delete assessment">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>`;
      });
    html += '</tbody></table>';
    summaryDiv.innerHTML = html;
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
