document.addEventListener('DOMContentLoaded', function() {
    // Set default selection
    const defaultValue = '86400'; // Default value for "24 Hours"
    const defaultText = '24 Hours';
    const button = document.getElementById('time-scale-btn');
    
    // Update button text
    button.textContent = defaultText;
    button.dataset.value = defaultValue;
});

// Function to handle the selection
function selectTimeScale(element) {
    const value = element.getAttribute('data-value');
    const text = element.textContent.trim();

    // Update the button text and value
    const button = document.getElementById('time-scale-btn');
    button.textContent = text;
    button.dataset.value = value;

    // Call the function to handle time scale change
    uiChangeTimeScale(value);
}

