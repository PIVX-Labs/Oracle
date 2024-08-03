// DOM Cache
const domDropdownContent = document.querySelector('.dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domPrice = document.getElementById('price');
const domTimestamp = document.getElementById('price-updated');

// Globals
let strSelectedCurrency = 'btc';

/**
 * @typedef {Object} Price
 * @property {string} currency - The currency type (e.g: 'btc')
 * @property {number} value -  The value of the currency
 * @property {number} last_updated - The timestamp (Unix) the value was last updated
 */

/**
 * @type {Price[]} A cache of all currencies valued against PIVX
 */
let arrPrices = [];

/** 
 * Converts a Unix Epoch to a Locale Time String
 * @param {number} epochTime - the unix epoch
 */
function fromEpochToDate(epochTime) {
    return new Date(epochTime * 1000).toLocaleTimeString();
}

/** Fetch a currency from cache by name */
function getCurrency(strCurrency) {
    return arrPrices.find(a => a.currency === strCurrency);
}

/** Render the state */
function updateDisplay() {
    // Update the Price UI
    const cCurrency = getCurrency(strSelectedCurrency);
    domPrice.innerText = `${cCurrency.value} ${cCurrency.currency.toUpperCase()}`;
    domTimestamp.innerText = `Last updated at ${fromEpochToDate(cCurrency.last_updated)}`;

    // Update the calculator "Currency" placeholder
    domCurInput.placeholder = cCurrency.currency.toUpperCase();

    // If a PIV value is specified, update the conversion too
    if (domPIVInput.value) convertCurrency(domPIVInput.value, strSelectedCurrency, true);
}

/** Fetch and cache all necessary data */
async function fetchAndPopulateCurrencies() {
    try {
        const response = await fetch(`${baseURL}/api/v1/currencies`);
        if (!response.ok) return console.error(`HTTP error! status: ${response.status}`);

        // All data for all currencies available gets fetched and cached
        arrPrices = await response.json();

        // If a currency is selected, re-render it's data!
        if (strSelectedCurrency) updateDisplay();

        // UI listener for selecting currencies
        domDropdownContent.addEventListener('click', function (e) {
            const target = e.target.closest('a');
            if (target) {
                e.preventDefault();
                strSelectedCurrency = target.dataset.value;
                domDropdownBtn.innerHTML = target.innerHTML;
                updateDisplay();
            }
        });
    } catch (error) {
        console.log('Fetching failed: ', error.message);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Fetch and populate the currencies every 5 seconds
    setInterval(fetchAndPopulateCurrencies, 5000);

    // With one initial fetch on page load
    fetchAndPopulateCurrencies();
});
