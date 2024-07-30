const pivInput = document.getElementById('piv-amount');
const currencyInput = document.getElementById('selected-currency-amount');
const swapButton = document.getElementById('swap-button');
let isPivToCurrency = true;

pivInput.addEventListener('input', function () {
        console.log('PIV to Currency conversion:', pivInput.value, selectedCurrency);
        convertCurrency(pivInput.value, selectedCurrency, isPivToCurrency);
});

currencyInput.addEventListener('input', function () {
        console.log('Currency to PIV conversion:', currencyInput.value, selectedCurrency);
        convertCurrency(currencyInput.value, selectedCurrency, isPivToCurrency);
});

swapButton.addEventListener('click', function () {
    isPivToCurrency = !isPivToCurrency;
    pivInput.value = '';
    currencyInput.value = '';
    updateConversionTickers();
});

function updateConversionTickers() {
    pivInput.placeholder = isPivToCurrency ? 'PIV' : selectedCurrency.currency.toUpperCase();
    currencyInput.placeholder = isPivToCurrency ? selectedCurrency.currency.toUpperCase() : 'PIV';
}

function convertCurrency(amount, currency, isPivToCurrency) {
    if (isPivToCurrency) {
        currencyInput.value = (amount * currency.value).toFixed(8);
    } else {
        pivInput.value = (amount / currency.value).toFixed(8);
    }
}