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