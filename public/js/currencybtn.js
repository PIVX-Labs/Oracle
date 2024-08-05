function setupDropdownListeners() {
    document.querySelector('.dropdown-btn').addEventListener('click', () => {
        domDropdownContent.style.display = domDropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    document.querySelectorAll('.dropdown-content a').forEach(item => {
        item.addEventListener('click', () => {
            domDropdownBtn.innerHTML = this.innerHTML;
        });
    });
}