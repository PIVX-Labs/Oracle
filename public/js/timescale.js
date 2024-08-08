const domTimeScaleDropdown = document.getElementById('time-scale-btn');
const domTimeScaleDefault = document.getElementById('time-scale-default');

document.addEventListener('DOMContentLoaded', () => {
    // Set default selection
    selectTimeScale(domTimeScaleDefault);
});

// Function to handle the selection
function selectTimeScale(element) {
    // Update the button text and value
    domTimeScaleDropdown.innerHTML = element.innerHTML;

    // Call the function to handle time scale change
    uiChangeTimeScale({ value: element.getAttribute('data-value') });
}