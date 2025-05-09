const assessmentsData = {};

document.addEventListener('DOMContentLoaded', function () {
    // Dynamically extract units from the dropdown
    const unitOptions = document.querySelectorAll('#UnitSelect option');
    unitOptions.forEach(opt => assessmentsData[opt.value] = []);

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
function renderAssessments(){
    const unit = document.getElementById('UnitSelect').value;
    const container = document.getElementById('assessmentsContainer');
    container.innerHTML = '';
    assessmentsData[unit].forEach((a, idx) => {
        const row = document.createElement('div');
        row.className = 'row mb-2';
        row.innerHTML = `
            <div class="col">
                <input type="text" placeholder="Name" class="form-control" value="${a.name}" onchange="updateAssessment(${idx}, 'name', this.value)">
            </div>
            <div class="col">
                <input type="number" placeholder="Obtained" class="form-control" value="${a.scoreObtained}" onchange="updateAssessment(${idx}, 'scoreObtained', this.value)">
            </div>
            <div class="col">
                <input type="number" placeholder="Total" class="form-control" value="${a.scoreTotal}" onchange="updateAssessment(${idx}, 'scoreTotal', this.value)">
            </div>
            <div class="col">
                <input type="number" placeholder="Weightage (%)" class="form-control" value="${a.weightage}" onchange="updateAssessment(${idx}, 'weightage', this.value)">
            </div>
            <div class="col">
                <button class="btn btn-danger" onclick="removeAssessment(${idx})"><i class="fa fa-trash"></i></button>
            </div>
        `;
        container.appendChild(row);
    });
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
    let html = `<table class="table"><thead><tr><th>Name</th><th>Score</th><th>Weightage</th><th>Weighted %</th></tr></thead></tbody>`;
    assessments.forEach(a => {
        const obtained = parseFloat(a.scoreObtained);
        const total = parseFloat(a.scoreTotal);
        const weight = parseFloat(a.weightage);
        let weighted = '-';
        if (!isNaN(obtained) && !isNaN(total) && total>0) {
            weighted = ((obtained/total)*weight).toFixed(2) + '%';
        }
        html += `<tr>
            <td>${a.name || '-'}</td>
            <td>${!isNaN(obtained) ? obtained : '-'} / ${!isNaN(total) ? total : '-'}</td>
            <td>${!isNaN(weight) ? weight : 0}%</td>
            <td>${weighted}</td>
        </tr>`;
        });
    html += '</tbody></table>';
    summaryDiv.innerHTML = html;
}

function saveAssessments(){
    fetch('/assessments', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({assessments: assessmentsData}),
        credentials: 'include'
    })
    .then(res=>res.json())
    .then(data=>alert('Assessments saves successfully!'))
    .catch(err => alert("Error saving assessments"));
}