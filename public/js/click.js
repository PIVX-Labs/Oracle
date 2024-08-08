// Get dropdown elements
const currencyBtn = document.querySelector('.custom-dropdown .dropdown-btn');
const currencyDropdown = document.getElementById('dropdown-container');
const timeScaleBtn = document.getElementById('time-scale-btn');
const timeScaleDropdown = document.querySelector('.time-scale-dropdown-content');

// Function to toggle dropdown visibility
function toggleDropdown(dropdown, button) {
    const isOpen = dropdown.style.display === 'block';
    
    // Close all dropdowns
    currencyDropdown.style.display = 'none';
    timeScaleDropdown.style.display = 'none';

    // Only open the clicked dropdown if it was not already open
    if (!isOpen) {
        dropdown.style.display = 'block';
    }
}

// Event listener for currency dropdown
currencyBtn.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent click event from propagating to document
    toggleDropdown(currencyDropdown, currencyBtn);
});

// Event listener for time scale dropdown
timeScaleBtn.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent click event from propagating to document
    toggleDropdown(timeScaleDropdown, timeScaleBtn);
});

// Click event to close dropdowns if clicking outside
document.addEventListener('click', function(event) {
    const target = event.target;
    if (!currencyBtn.contains(target) && !currencyDropdown.contains(target)) {
        currencyDropdown.style.display = 'none';
    }
    if (!timeScaleBtn.contains(target) && !timeScaleDropdown.contains(target)) {
        timeScaleDropdown.style.display = 'none';
    }
});