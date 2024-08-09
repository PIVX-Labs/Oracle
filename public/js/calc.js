/** @type {HTMLInputElement} */
const domPIVInput = document.getElementById('piv-amount');

/** @type {HTMLInputElement} */
const domCurInput = document.getElementById('selected-currency-amount');

// Calculator input listeners
domPIVInput.addEventListener('input', () => convertCurrency(domPIVInput.value, strSelectedCurrency, true));
domCurInput.addEventListener('input', () => convertCurrency(domCurInput.value, strSelectedCurrency, false));

/**
 * Converts and renders the given PIVX/Currency pair
 * @param {number} amount - the amount of PIV or Currency
 * @param {string} currency - the ticker of the Currency we're converting with
 * @param {boolean} toCurrency - `true` if converting from PIV to `currency`, `false` if converting from `currency` to PIV
 */
function convertCurrency(amount, currency, toCurrency = true) {
    const cCurrency = getCurrency(currency);
    if (!cCurrency) return;

    if (toCurrency) {
        domCurInput.value = n(amount * cCurrency.value) || ''
    } else {
        domPIVInput.value = n(amount / cCurrency.value) || '';
    }
}

/**
 * Efficiently round a number to the nearest specified decimal place
 * @param {Number} amount 
 * @param {Number} decimals - defaults to 8
 */
function n(amount, decimals = 8) {
    const factor = 10 ** decimals;
    return Math.round(amount * factor) / factor;
}