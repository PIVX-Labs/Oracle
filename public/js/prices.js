document.addEventListener('DOMContentLoaded', function () {
    const dropdownContent = document.querySelector('.dropdown-content');
    const dropdownBtn = document.querySelector('.dropdown-btn');
    const priceBox = document.getElementById('price');
    const timestamp = document.getElementById('price-updated');

   
    let selectedCurrency = ''; // Keep track of selected currency

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

    dropdownContent.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target) {
            e.preventDefault();
            selectedCurrency = target.dataset.value;
            dropdownBtn.innerHTML = target.innerHTML;
            fetchPrice(selectedCurrency);
        }
    });

    function fetchPrice(currency) {
        if (!currency) {
            priceBox.textContent = ''; // Clear price box if no currency
            timestamp.textContent = '';
            return;
        }
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=pivx&vs_currencies=${currency}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.pivx && data.pivx[currency]) {
                    const price = data.pivx[currency];
                    priceBox.textContent = `${price} ${currency.toUpperCase()}`;
                    timestamp.textContent = `Last updated at ${new Date().toLocaleTimeString()}`;
                } else {
                    priceBox.textContent = 'N/A';
                    timestamp.textContent = '';
                }
            })
            .catch(error => {
                console.error('Error fetching price:', error);
                priceBox.textContent = 'Error';
                timestamp.textContent = '';
            });
    }

    function fromEpochToDate(epochTime) {
        const epochInMs = epochTime * 1000;
        const date = new Date(epochInMs);
        return date.toLocaleTimeString();
    }

    function updateDisplay(selectedCurrency) {
        if (!selectedCurrency) {
            priceBox.textContent = ''; // Clear price box if no currency
            timestamp.textContent = '';
            return;
        }
        const priceElement = document.getElementById('price');
        const lastUpdatedElement = document.getElementById('price-updated');

        priceElement.textContent = `${selectedCurrency.value} ${selectedCurrency.currency.toUpperCase()}`;
        lastUpdatedElement.textContent = `Last updated at ${fromEpochToDate(selectedCurrency.last_updated)}`;
    }

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
            } else {
                // Clear the display if no currency is selected
                updateDisplay(null);
            }
        } catch (error) {
            console.log('Fetching failed: ', error.message);
        }
    }

    // Fetch and populate the currencies every 5 seconds
    setInterval(fetchAndPopulateCurrencies, 5000);

    // With one initial fetch on page load
    fetchAndPopulateCurrencies();
});
