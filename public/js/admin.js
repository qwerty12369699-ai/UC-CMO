/**
 * Admin Dashboard JavaScript
 * Utility functions for admin dashboard pages.
 * Auth check and initial data loading are handled inline in admin.html.
 */

// Chart instances (managed by inline script in admin.html)
let cultureChart = null;
let stylesChart = null;

/**
 * Initialize charts with data from the stats API
 */
function initializeCharts(reservationsByType, clientDistribution) {
    const cultureCtx = document.getElementById('cultureChart');
    const stylesCtx = document.getElementById('stylesChart');
    
    if (!cultureCtx || !stylesCtx) return;

    // Destroy existing charts
    if (cultureChart) cultureChart.destroy();
    if (stylesChart) stylesChart.destroy();

    // Reservation Distribution (Pie Chart)
    const typeLabels = (reservationsByType || []).map(d => d.type || d.label || 'N/A');
    const typeCounts = (reservationsByType || []).map(d => d.count || d.value || 0);

    cultureChart = new Chart(cultureCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: typeLabels.length ? typeLabels : ['No Data'],
            datasets: [{
                data: typeCounts.length ? typeCounts : [1],
                backgroundColor: ['#2e7d32', '#66bb6a', '#a5d6a7', '#c8e6c9', '#e8f5e9'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Client Distribution (Bar Chart)
    const clientLabels = (clientDistribution || []).map(d => d.name || 'Unknown');
    const clientCounts = (clientDistribution || []).map(d => d.count || d.value || 0);

    stylesChart = new Chart(stylesCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: clientLabels.length ? clientLabels : ['No Data'],
            datasets: [{
                label: 'Reservations',
                data: clientCounts.length ? clientCounts : [0],
                backgroundColor: '#2e7d32',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}