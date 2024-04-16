// Get the current URL
const currentURL = new URL(window.location.href);

// Identify the part of the path after the domain until the first '/'
const afterDomain = currentURL.pathname.split('/')[1];

// Base URL
let baseURL = "";

// Check if the part after the domain matches the service name
// If matches, then set that to the base URL
if (afterDomain === "oracle") {
    baseURL = `/${afterDomain}`;
}


let arrPrices = [];

/**
 * Function to get epoch time and convert to locale string.
 * @param {Number} epochTime - The epoch time in seconds
 * @return {String} A string representing the time
 */
function fromEpochToDate(epochTime) {
    const epochInMs = epochTime * 1000;
    const date = new Date(epochInMs);
    return date.toLocaleTimeString();
}

/**
 * Function to update display: Price of selected currency and its last updated time
 * @param {Object} selectedCurrency - selected currency object
 */
function updateDisplay(selectedCurrency) {
    const priceElement = document.getElementById('price');
    const lastUpdatedElement = document.getElementById('price-updated');

    priceElement.textContent = `${selectedCurrency.value} ${selectedCurrency.currency.toUpperCase()}`;
    lastUpdatedElement.textContent = `Last updated at ${fromEpochToDate(selectedCurrency.last_updated)}`;
}

/**
* Function to fetch currency data from the API and populate the dropdown every 5 seconds.
* In addition, it also sets the selected currency's value and last updated time as per user selection
*/
async function fetchAndPopulateCurrencies() {
    try {
        const response = await fetch(`${baseURL}/api/v1/currencies`);
        if (!response.ok) return console.error(`HTTP error! status: ${response.status}`);

        arrPrices = await response.json();

        const selectElement = document.getElementById('currencySelect');

        // Save the previously selected currency
        const previousSelectedCurrency = selectElement.value;

        // Clear previous options
        selectElement.innerHTML = '';

        arrPrices.forEach((currency) => {
            const option = document.createElement('option');
            option.textContent = currency.currency.toUpperCase();
            option.value = currency.currency;
            selectElement.appendChild(option);

            // If this was the previously selected currency, select it again
            if (currency.currency === previousSelectedCurrency) {
                selectElement.value = option.value;
            }
        });

        selectElement.addEventListener('change', function (event) {
            const selectedCurrency = arrPrices.find(a => a.currency === this.value);
            updateDisplay(selectedCurrency);
        });

        // Set the details to the currently selected currency
        const selectedCurrency = arrPrices.find(a => a.currency === selectElement.value);
        if (selectedCurrency) {
            updateDisplay(selectedCurrency);
        }
    } catch (error) {
        console.log('Fetching failed: ', error.message);
    }
}

// Fetch and populate the currencies every 5 seconds
setInterval(fetchAndPopulateCurrencies, 5000);

// With one initial fetch on page load
window.onload = fetchAndPopulateCurrencies;