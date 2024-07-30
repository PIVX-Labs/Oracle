// DOM Cache
const dropdownContent = document.querySelector('.dropdown-content');
const dropdownBtn = document.querySelector('.dropdown-btn');
const priceBox = document.getElementById('price');
const timestamp = document.getElementById('price-updated');

// Globals
let selectedCurrency = null;
let arrPrices = [];

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

// Get all links
const links = document.querySelectorAll('a');

// Regex that tests if URL is not external
const regex = new RegExp('^(http://|https://|ftp://|\/\/)');

// Iterate over each link and replace href if not external
links.forEach(link => {
    const originalHref = link.getAttribute('href');
    // Check if originalHref contains baseURL and is not external
    if (!originalHref.startsWith(baseURL) && !regex.test(originalHref)) {
        // Prepend baseURL to the original href only when it's not already there and not an external URL
        link.setAttribute('href', `${baseURL}${originalHref}`);
    }
});

function fromEpochToDate(epochTime) {
    return new Date(epochTime * 1000).toLocaleTimeString();
}

function updateDisplay() {
    const priceElement = document.getElementById('price');
    const lastUpdatedElement = document.getElementById('price-updated');

    priceElement.textContent = `${selectedCurrency.value} ${selectedCurrency.currency.toUpperCase()}`;
    lastUpdatedElement.textContent = `Last updated at ${fromEpochToDate(selectedCurrency.last_updated)}`;
}

async function fetchAndPopulateCurrencies() {
    try {
        const response = await fetch(`${baseURL}/api/v1/currencies`);
        if (!response.ok) return console.error(`HTTP error! status: ${response.status}`);

        // All data for all currencies available gets fetched and cached
        arrPrices = await response.json();

        // UI listener for selecting currencies
        dropdownContent.addEventListener('click', function (e) {
            const target = e.target.closest('a');
            if (target) {
                e.preventDefault();
                selectedCurrency = arrPrices.find(a => a.currency === target.dataset.value);
                dropdownBtn.innerHTML = target.innerHTML;
                updateDisplay();
                updateConversionTickers();
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
