document.addEventListener('DOMContentLoaded', function() {
    // Calculate activity time data
    const activityData = calculateActivityTime();
    
    // Create the chart
    createActivityChart(activityData);
    
    // Populate summary table
    populateSummaryTable(activityData);

    createAssessmentChart();
  });
  
  function calculateActivityTime() {
    // Get the user's saved activities
    const activities = window.userSavedActivities || [];
    
    // Group by activity name and count time slots
    const activityTimeMap = {};
    const activityColorMap = {};
    let totalHours = 0;
    
    activities.forEach(activity => {
      const name = activity.activity_number;
      const color = activity.color || '#000000';
      
      // Initialize if not already in map
      if (!activityTimeMap[name]) {
        activityTimeMap[name] = 0;
        activityColorMap[name] = color;
      }
      
      // Each cell represents 30 minutes (0.5 hours)
      activityTimeMap[name] += 0.5;
      totalHours += 0.5;
    });
    
    // Convert to array format for Chart.js
    const labels = Object.keys(activityTimeMap);
    const data = labels.map(name => activityTimeMap[name]);
    const colors = labels.map(name => activityColorMap[name]);
    
    // Calculate percentages
    const percentages = data.map(value => ((value / totalHours) * 100).toFixed(1));
    
    return {
      labels,
      data,
      colors,
      percentages,
      totalHours
    };
  }
  
  function createActivityChart(activityData) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: activityData.labels,
        datasets: [{
          label: 'Hours',
          data: activityData.data,
          backgroundColor: activityData.colors,
          borderColor: activityData.colors.map(color => darkenColor(color, 0.1)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Activities'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              footer: function(tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                const percentage = activityData.percentages[index];
                return `${percentage}% of total time`;
              }
            }
          }
        }
      }
    });
  }
  
  function populateSummaryTable(activityData) {
    const tableBody = document.getElementById('activitySummaryTable').querySelector('tbody');
    tableBody.innerHTML = '';
    
    activityData.labels.forEach((activity, index) => {
      const row = document.createElement('tr');
      
      // Activity name with color indicator
      const nameCell = document.createElement('td');
      const colorSquare = document.createElement('span');
      colorSquare.style.display = 'inline-block';
      colorSquare.style.width = '15px';
      colorSquare.style.height = '15px';
      colorSquare.style.backgroundColor = activityData.colors[index];
      colorSquare.style.marginRight = '8px';
      nameCell.appendChild(colorSquare);
      nameCell.appendChild(document.createTextNode(activity));
      
      // Hours
      const hoursCell = document.createElement('td');
      hoursCell.textContent = activityData.data[index];
      
      // Percentage
      const percentCell = document.createElement('td');
      percentCell.textContent = activityData.percentages[index] + '%';
      
      row.appendChild(nameCell);
      row.appendChild(hoursCell);
      row.appendChild(percentCell);
      
      tableBody.appendChild(row);
    });
    
    // Add total row
    const totalRow = document.createElement('tr');
    totalRow.className = 'table-active';
    
    const totalLabelCell = document.createElement('td');
    totalLabelCell.textContent = 'Total';
    totalLabelCell.style.fontWeight = 'bold';
    
    const totalHoursCell = document.createElement('td');
    totalHoursCell.textContent = activityData.totalHours;
    totalHoursCell.style.fontWeight = 'bold';
    
    const totalPercentCell = document.createElement('td');
    totalPercentCell.textContent = '100%';
    totalPercentCell.style.fontWeight = 'bold';
    
    totalRow.appendChild(totalLabelCell);
    totalRow.appendChild(totalHoursCell);
    totalRow.appendChild(totalPercentCell);
    
    tableBody.appendChild(totalRow);
  }
  
  // Helper function to darken a color
  function darkenColor(color, amount) {
    let hex = color;
    
    // Convert RGB to hex if needed
    if (color.startsWith('rgb')) {
      const rgbValues = color.match(/\d+/g);
      hex = '#' + rgbValues.map(x => {
        const hex = parseInt(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    }
    
    // Remove the # symbol if present
    hex = hex.replace('#', '');
    
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function createAssessmentChart() {
    if (!window.assessmentAverages || window.assessmentAverages.length === 0) return;
  
    const ctx = document.getElementById('assessmentChart').getContext('2d');
    const labels = window.assessmentAverages.map(item => item.unit);
    const data = window.assessmentAverages.map(item => item.average);
  
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Average Score (%)',
          data: data,
          backgroundColor: '#4e73df'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Units'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }