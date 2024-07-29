document.querySelector('.dropdown-btn').addEventListener('click', function() {
    const dropdownContent = document.querySelector('.dropdown-content');
    dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
});

document.querySelectorAll('.dropdown-content a').forEach(item => {
    item.addEventListener('click', function() {
        const value = this.getAttribute('data-value');
        const button = document.querySelector('.dropdown-btn');
        button.innerHTML = this.innerHTML;
        button.setAttribute('data-value', value);
        document.querySelector('.dropdown-content').style.display = 'none';
    });
});
