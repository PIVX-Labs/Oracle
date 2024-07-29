document.addEventListener('DOMContentLoaded', function () {
    const dropdownContent = document.querySelector('.dropdown-content');
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const priceBox = document.getElementById('price');
    const timestamp = document.getElementById('price-updated');
    const pivInput = document.getElementById('piv-amount');
    const currencyInput = document.getElementById('selected-currency-amount');
    const swapButton = document.getElementById('swap-button');
    let selectedCurrency = null; // No default currency
    let isPivToCurrency = true;

    dropdownContent.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target) {
            e.preventDefault();
            selectedCurrency = target.dataset.value;
            dropdownBtn.innerHTML = target.innerHTML;
            fetchPrice(selectedCurrency);
        }
    });

    pivInput.addEventListener('input', function () {
        if (selectedCurrency && isPivToCurrency) {
            console.log('PIV to Currency conversion:', pivInput.value, selectedCurrency);
            convertCurrency(pivInput.value, selectedCurrency, isPivToCurrency);
        }
    });

    currencyInput.addEventListener('input', function () {
        if (selectedCurrency && !isPivToCurrency) {
            console.log('Currency to PIV conversion:', currencyInput.value, selectedCurrency);
            convertCurrency(currencyInput.value, selectedCurrency, isPivToCurrency);
        }
    });

    swapButton.addEventListener('click', function () {
        isPivToCurrency = !isPivToCurrency;
        pivInput.value = '';
        currencyInput.value = '';
        pivInput.placeholder = isPivToCurrency ? 'PIV' : selectedCurrency.toUpperCase();
        currencyInput.placeholder = isPivToCurrency ? selectedCurrency.toUpperCase() : 'PIV';
    });

    function fetchPrice(currency) {
        if (!currency) return; // Skip if no currency is selected
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=pivx&vs_currencies=${currency}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.pivx && data.pivx[currency]) {
                    const price = data.pivx[currency];
                    priceBox.textContent = `${price} ${currency.toUpperCase()}`;
                    timestamp.textContent = `Last updated at ${new Date().toLocaleTimeString()}`;
                } else {
                    priceBox.textContent = '';
                    timestamp.textContent = '';
                }
            })
            .catch(error => {
                console.error('Error fetching price:', error);
                priceBox.textContent = '';
                timestamp.textContent = '';
            });
    }

    function convertCurrency(amount, currency, isPivToCurrency) {
        console.log('Fetching conversion rate for:', currency);
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=pivx&vs_currencies=${currency}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.pivx && data.pivx[currency]) {
                    const rate = data.pivx[currency];
                    if (isPivToCurrency) {
                        currencyInput.value = (amount * rate).toFixed(8);
                    } else {
                        pivInput.value = (amount / rate).toFixed(8);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching conversion rate:', error);
            });
    }
});
