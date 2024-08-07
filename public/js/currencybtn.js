function setupDropdownListeners() {
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const dropdownContainer = document.querySelector('.dropdown-container');
    const dropdownSearch = document.querySelector('.dropdown-search');
    const dropdownContentLinks = document.querySelectorAll('.dropdown-content a');

    dropdownBtn.addEventListener('click', (event) => {
        dropdownContainer.style.display = dropdownContainer.style.display === 'block' ? 'none' : 'block';
        // If the dropdown is opened, focus the cursor on the search input
        if (dropdownContainer.style.display === 'block') {
            dropdownSearch.focus();
        }
        event.stopPropagation(); // Prevent the click from propagating to the document
    });

    dropdownContentLinks.forEach(item => {
        item.addEventListener('click', function () {
            dropdownBtn.innerHTML = this.innerHTML;
            dropdownContainer.style.display = 'none'; // Close the dropdown after selection
        });
    });

    document.addEventListener('click', (event) => {
        if (!dropdownContainer.contains(event.target) && event.target !== dropdownBtn) {
            dropdownContainer.style.display = 'none';
        }
    });

    // Prevent closing the dropdown when clicking inside it
    dropdownContainer.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

// Call the function to set up the listeners
setupDropdownListeners();
