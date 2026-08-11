let currentDate = new Date();
let selectedDate = null;
let selectedVenue = null;
let reservedDates = {};
let allReservedDates = {}; // Store all reservations before filtering
let currentVenueFilter = '';

document.addEventListener('DOMContentLoaded', function() {
    initializeRulesSection();
    initializeVenueSelection();
    initializeCalendar();
    initializeVenueFilter();
    loadReservedDates();
});

function initializeRulesSection() {
    const acceptCheckbox = document.getElementById('accept-rules');
    const acceptBtn = document.getElementById('accept-btn');
    
    if (acceptCheckbox && acceptBtn) {
        acceptCheckbox.addEventListener('change', function() {
            acceptBtn.disabled = !this.checked;
        });
    }
}

function initializeVenueSelection() {
    const venueCards = document.querySelectorAll('.venue-card');
    venueCards.forEach(card => {
        card.addEventListener('click', () => selectVenue(card));
    });
}

function initializeVenueFilter() {
    const venueFilter = document.getElementById('venue-filter');
    if (venueFilter) {
        venueFilter.addEventListener('change', function() {
            currentVenueFilter = this.value;
            applyVenueFilter();
        });
    }
}

function applyVenueFilter() {
    if (currentVenueFilter === '') {
        // Show all reservations
        reservedDates = { ...allReservedDates };
    } else {
        // Filter reservations by venue
        reservedDates = {};
        Object.keys(allReservedDates).forEach(dateStr => {
            const dateReservations = allReservedDates[dateStr];
            const filteredReservations = [];

            if (Array.isArray(dateReservations)) {
                dateReservations.forEach(reservation => {
                    if (reservation.venue === currentVenueFilter || reservation.location === currentVenueFilter) {
                        filteredReservations.push(reservation);
                    }
                });
                if (filteredReservations.length > 0) {
                    reservedDates[dateStr] = filteredReservations.length === 1 ? filteredReservations[0] : filteredReservations;
                }
            } else {
                if (dateReservations.venue === currentVenueFilter || dateReservations.location === currentVenueFilter) {
                    reservedDates[dateStr] = dateReservations;
                }
            }
        });
    }

    renderCalendar();
    try { updateLegend(); } catch(e) { }
}

function selectVenue(venueCard) {
    // Remove previous selection
    document.querySelectorAll('.venue-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selection to clicked card
    venueCard.classList.add('selected');

    // Store selected venue
    selectedVenue = venueCard.dataset.venue;

    // Store selected venue in localStorage for form use
    localStorage.setItem('selectedReservationVenue', selectedVenue);

    // Update venue filter to show only selected venue
    const venueFilter = document.getElementById('venue-filter');
    if (venueFilter) {
        venueFilter.value = selectedVenue;
        venueFilter.disabled = false;
        currentVenueFilter = selectedVenue;
    }

    // Update display
    document.getElementById('selected-venue-display').textContent = selectedVenue;
    document.getElementById('selected-venue-info').style.display = 'block';
    document.getElementById('venue-continue-btn').disabled = false;
}

function acceptRules() {
    const rulesSection = document.getElementById('rules-section');
    const venueSection = document.getElementById('venue-section');

    if (rulesSection && venueSection) {
        rulesSection.style.display = 'none';
        venueSection.style.display = 'block';
    }
}

function proceedToCalendar() {
    if (!selectedVenue) return;

    const venueSection = document.getElementById('venue-section');
    const calendarSection = document.getElementById('calendar-section');
    const calendarVenueDisplay = document.getElementById('calendar-venue-display');

    if (venueSection && calendarSection && calendarVenueDisplay) {
        venueSection.style.display = 'none';
        calendarSection.style.display = 'block';
        calendarVenueDisplay.textContent = selectedVenue;

        // Set venue filter to selected venue and apply filter
        currentVenueFilter = selectedVenue;
        applyVenueFilter();
    }
}

function declineRules() {
    showConfirmationModal({
        title: 'Decline Rules and Regulations',
        message: 'Are you sure you want to decline the rules and regulations? You will be redirected to the home page.',
        confirmText: 'Yes, Decline',
        cancelText: 'Cancel',
        onConfirm: () => {
            window.location.href = '../home.html';
        }
    });
}

function initializeCalendar() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        nextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
}

function renderCalendar() {
    const monthYearElement = document.getElementById('current-month-year');
    const calendarGrid = document.querySelector('.calendar-grid');
    
    if (!monthYearElement || !calendarGrid) return;
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    monthYearElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    const dayHeaders = calendarGrid.querySelectorAll('.day-header');
    calendarGrid.innerHTML = '';
    dayHeaders.forEach(header => calendarGrid.appendChild(header));

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    for (let i = 0; i < startDate; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('calendar-day', 'disabled');
        calendarGrid.appendChild(emptyCell);
    }

    const today = new Date();
    const todayStr = formatDate(today);

    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.textContent = day;

        const currentDateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        if (currentDateStr === todayStr) {
            dayElement.classList.add('today');
        }

        const minAcceptableDate = new Date(today);
        minAcceptableDate.setDate(minAcceptableDate.getDate() + 14);
        const minAcceptableDateStr = formatDate(minAcceptableDate);

        if (dayDate < minAcceptableDate) {
            dayElement.classList.add('disabled');
        }

        if (reservedDates[currentDateStr]) {
            dayElement.classList.add('reserved');
            dayElement.style.cursor = 'not-allowed';

            const reservationData = reservedDates[currentDateStr];
            const event = Array.isArray(reservationData) ? reservationData[0] : reservationData;
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;

            const eventTitle = document.createElement('div');
            eventTitle.className = 'event-title';
            eventTitle.textContent = truncateText(event.title, 20);
            eventTitle.title = event.title;

            const eventLocation = document.createElement('div');
            eventLocation.className = 'event-location';
            eventLocation.textContent = truncateText(event.location || 'TBD', 25);
            eventLocation.title = event.location || 'TBD';

            dayElement.textContent = '';
            dayElement.appendChild(dayNumber);
            dayElement.appendChild(eventTitle);
            dayElement.appendChild(eventLocation);
        }

        if (selectedDate && currentDateStr === selectedDate) {
            dayElement.classList.add('selected');
        }

        if (!dayElement.classList.contains('disabled') && !dayElement.classList.contains('reserved')) {
            dayElement.addEventListener('click', () => selectDate(currentDateStr, dayElement));
            dayElement.style.cursor = 'pointer';
        } else if (dayElement.classList.contains('reserved')) {
            dayElement.addEventListener('click', () => {
                const events = Array.isArray(reservedDates[currentDateStr]) ? reservedDates[currentDateStr] : [reservedDates[currentDateStr]];
                const dayText = new Date(currentDateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                // Add day information to each event
                const eventsWithDay = events.map(event => ({
                    ...event,
                    day: dayText
                }));

                showReservationDetailsModal({
                    title: 'Existing Reservations',
                    message: 'This date has existing reservations. You can still book this date with different times.',
                    reservations: eventsWithDay,
                    allowSelection: true,
                    onSelect: () => {
                        selectDate(currentDateStr, dayElement);
                        // Store existing reservations for time conflict checking
                        localStorage.setItem('existingReservations', JSON.stringify(events));
                        // Enable continue button and proceed to forms
                        const continueBtn = document.getElementById('continue-btn');
                        if (continueBtn) {
                            continueBtn.disabled = false;
                        }
                    }
                });
            });
            // Also allow direct selection by making it clickable
            dayElement.style.cursor = 'pointer';
        }
        
        calendarGrid.appendChild(dayElement);
    }
}

function selectDate(dateStr, dayElement = null) {
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });

    if (dayElement) {
        dayElement.classList.add('selected');
    }
    selectedDate = dateStr;

    // Store selected date for form use
    localStorage.setItem('selectedReservationDate', dateStr);

    const selectedDateInfo = document.getElementById('selected-date-info');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const continueBtn = document.getElementById('continue-btn');

    if (selectedDateInfo && selectedDateDisplay && continueBtn) {
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        selectedDateDisplay.textContent = formattedDate;
        selectedDateInfo.style.display = 'block';
        continueBtn.disabled = false;
    }

    // Update legend to show reservations (times) for the selected date
    try { updateLegend(dateStr); } catch (e) { /* ignore if updateLegend not available */ }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Color palette for per-event legend dots
const LEGEND_COLORS = ['#ff7043','#ffb300','#8e24aa','#3949ab','#00acc1','#7cb342','#fb8c00'];

function updateLegend(dateStr = null) {
    const legendContainer = document.querySelector('.cal-legend');
    if (!legendContainer) return;

    // Determine target date: passed dateStr > selectedDate > none
    const targetDate = dateStr || selectedDate || null;

    if (targetDate && reservedDates[targetDate]) {
        const events = Array.isArray(reservedDates[targetDate]) ? reservedDates[targetDate] : [reservedDates[targetDate]];

        // Build legend entries: dot + title + time
        legendContainer.innerHTML = '';
        events.forEach((ev, idx) => {
            const color = LEGEND_COLORS[idx % LEGEND_COLORS.length];
            const span = document.createElement('span');
            span.style.display = 'flex';
            span.style.alignItems = 'center';
            span.style.gap = '6px';
            span.style.fontSize = '0.85rem';
            const dot = document.createElement('span');
            dot.className = 'legend-dot';
            dot.style.background = color;
            dot.style.borderColor = color;
            dot.style.width = '12px';
            dot.style.height = '12px';
            dot.style.borderRadius = '50%';
            const title = (ev.title || 'Reserved').trim();
            const time = (ev.time || '').trim();
            const text = document.createTextNode(`${title}${time ? ' — ' + time : ''}`);
            span.appendChild(dot);
            span.appendChild(text);
            legendContainer.appendChild(span);
        });

        // Also add available helper
        const spacer = document.createElement('span');
        spacer.style.display = 'flex';
        spacer.style.alignItems = 'center';
        spacer.style.gap = '6px';
        spacer.style.fontSize = '0.85rem';
        spacer.innerHTML = `<span class="legend-dot avail" style="width:12px;height:12px;border-radius:50%;border:2px solid var(--gray-200);background:white;margin-right:6px;"></span> Available`;
        legendContainer.appendChild(spacer);
        return;
    }

    // Default legend
    legendContainer.innerHTML = `
        <span><span class="legend-dot avail"></span> Available</span>
        <span><span class="legend-dot reserved"></span> Reserved</span>
        <span><span class="legend-dot selected"></span> Selected</span>
    `;
}


async function loadReservedDates() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/reservations/calendar', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Reservation calendar API returned', data);

            // Quick debug: list confirmed items
            const confirmedItems = data.filter(it => it.status === 'confirmed');
            if (confirmedItems.length) console.log('Confirmed reservations (debug):', confirmedItems);

            // Transform the data into the expected format - support multiple reservations per date
            allReservedDates = {};
            data.forEach(item => {
                // Use local date formatting to avoid timezone issues
                const date = new Date(item.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const reservation = {
                    title: item.title,
                    time: item.time,
                    location: item.location,
                    venue: item.venue || item.location,
                    status: item.status
                };

                // Support multiple reservations per date
                if (allReservedDates[dateStr]) {
                    if (Array.isArray(allReservedDates[dateStr])) {
                        allReservedDates[dateStr].push(reservation);
                    } else {
                        allReservedDates[dateStr] = [allReservedDates[dateStr], reservation];
                    }
                } else {
                    allReservedDates[dateStr] = reservation;
                }
            });

            // Apply current venue filter
            reservedDates = { ...allReservedDates };
            applyVenueFilter();

            renderCalendar();
            // refresh legend after calendar renders
            try { updateLegend(); } catch(e){ /* ignore if function not yet defined */ }
        } else {
            throw new Error('Failed to load calendar data');
        }
    } catch (error) {
        console.error('Error loading reserved dates:', error);
        loadMockReservedDates();
    }
}
function loadMockReservedDates() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 15);
    
    reservedDates = {
        [formatDate(nextWeek)]: {
            title: 'Faculty Meeting',
            time: '10:00 AM - 12:00 PM',
            location: 'Conference Room'
        },
        [formatDate(nextMonth)]: {
            title: 'Student Orientation',
            time: '1:00 PM - 4:00 PM',
            location: 'Auditorium'
        }
    };
    
    renderCalendar();
    try { updateLegend(); } catch(e){ }
}

function goBackToRules() {
    const rulesSection = document.getElementById('rules-section');
    const venueSection = document.getElementById('venue-section');

    if (rulesSection && venueSection) {
        venueSection.style.display = 'none';
        rulesSection.style.display = 'block';

        // Reset venue selection
        selectedVenue = null;
        document.querySelectorAll('.venue-card').forEach(card => {
            card.classList.remove('selected');
        });
        const selectedVenueInfo = document.getElementById('selected-venue-info');
        const venueContinueBtn = document.getElementById('venue-continue-btn');

        if (selectedVenueInfo) selectedVenueInfo.style.display = 'none';
        if (venueContinueBtn) venueContinueBtn.disabled = true;

        const acceptCheckbox = document.getElementById('accept-rules');
        const acceptBtn = document.getElementById('accept-btn');
        if (acceptCheckbox && acceptBtn) {
            acceptCheckbox.checked = false;
            acceptBtn.disabled = true;
        }
    }
}

function goBackToVenue() {
    const venueSection = document.getElementById('venue-section');
    const calendarSection = document.getElementById('calendar-section');

    if (venueSection && calendarSection) {
        calendarSection.style.display = 'none';
        venueSection.style.display = 'block';

        // Reset selected date
        selectedDate = null;
        const selectedDateInfo = document.getElementById('selected-date-info');
        const continueBtn = document.getElementById('continue-btn');

        if (selectedDateInfo) selectedDateInfo.style.display = 'none';
        if (continueBtn) continueBtn.disabled = true;

        // Clear any selected date styling
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });
    }
}

function proceedToForms() {
    if (!selectedDate) {
        alert('Please select a date first.');
        return;
    }

    if (!selectedVenue) {
        alert('Please select a venue first.');
        return;
    }

    localStorage.setItem('selectedReservationDate', selectedDate);
    localStorage.setItem('selectedReservationVenue', selectedVenue);

    const calendarSection = document.getElementById('calendar-section');
    const formSelection = document.getElementById('form-selection');

    if (calendarSection && formSelection) {
        calendarSection.style.display = 'none';
        formSelection.style.display = 'block';
    }
}

function checkAuthentication() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function navigateToForm(formUrl) {
    if (!selectedDate) {
        alert('Please select a date first.');
        return;
    }

    localStorage.setItem('selectedReservationDate', selectedDate);
    localStorage.setItem('selectedFormType', formUrl.replace('.html', ''));

    window.location.href = formUrl;
}

if (!checkAuthentication()) {
}
