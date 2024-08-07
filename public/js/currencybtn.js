function setupDropdownListeners() {
    document.querySelector('.dropdown-btn').addEventListener('click', () => {
        domDropdownContainer.style.display = domDropdownContainer.style.display === 'block' ? 'none' : 'block';
        // If the dropdown is opened, focus the cursor on the search input
        if (domDropdownContainer.style.display === 'block') {
            domDropdownSearch.focus();
        }
    });

    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', () => {
            domDropdownBtn.innerHTML = this.innerHTML;
        });
    });
}