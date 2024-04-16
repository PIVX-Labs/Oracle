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

/**
* Function to fetch currency data from the API and populate the datapoints every 60 seconds.
* In addition, it also sets the selected currency's value and last updated time as per user selection
*/
async function fetchAndPopulateCurrencies() {
    try {
        // Update the Currencies API example
        const resCurrencies = await fetch(`${baseURL}/api/v1/currencies`);
        if (!resCurrencies.ok) return console.error(`HTTP error! status: ${resCurrencies.status}`);
        const arrCurrencies = await resCurrencies.json();
        document.getElementById('currencies').innerHTML = JSON.stringify(arrCurrencies, null, 4);

        // Update the Price API example
        const resPrice = await fetch(`${baseURL}/api/v1/price/usd`);
        if (!resPrice.ok) return console.error(`HTTP error! status: ${resPrice.status}`);
        const arrPrices = await resPrice.json();
        document.getElementById('price').innerHTML = JSON.stringify(arrPrices, null, 4);
    } catch (error) {
        console.log('Fetching failed: ', error.message);
    }
}

setInterval(fetchAndPopulateCurrencies, 60000);
fetchAndPopulateCurrencies();