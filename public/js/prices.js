// DOM Cache
const domDropdownContent = document.querySelector('.dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domPrice = document.getElementById('price');
const domTimestamp = document.getElementById('price-updated');
const domPriceChart = document.getElementById('price-chart');

// Globals
let strSelectedCurrency = 'btc';
let priceChart = null;

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
 * The historical price of the current selected currency
 */
let arrHistorical = []

/** 
 * Converts a Unix Epoch to a Locale Time String
 * @param {number} epochTime - the unix epoch
 */
function fromEpochToDate(epochTime) {
    return new Date(epochTime * 1000).toLocaleTimeString();
}

/**
 * Convert Unix timestamp to time in format HH:MM.
 *
 * @param {number} ts - Unix timestamp.
 * @returns {string} The time in format HH:MM.
 */
function fromEpochtoTime(ts) {
    const date = new Date(ts * 1000);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
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

    // Update chart data
    updatePriceChart();
}

/** Render the Price Chart */
async function updatePriceChart() {
    const chartRes = await fetch(`https://pivxla.bz/oracle/api/v1/historical/${strSelectedCurrency}`);
    if (chartRes.ok) {
        arrHistorical = (await chartRes.json()).value;

        // Convert the historical data in to Chart Data
        priceChart.data.labels = [];
        priceChart.data.datasets[0] = {
            data: [],
            fill: false,
            borderColor: "white",
            lineTension: 0.2,
            borderWidth: 4
        };
        for (const cPoint of arrHistorical) {
            priceChart.data.labels.push(fromEpochtoTime(cPoint.timeUpdated));
            priceChart.data.datasets[0].data.push(cPoint.tickerPrice);
        }

        // TODO: remove the 'none' to allow animated updating post-init... but find a way to make it smooth
        priceChart.update(fFirstChartRender ? '' : 'none');
        fFirstChartRender = false;
    }
}

/** A flag to determine if this is the first chart render */
let fFirstChartRender = true;

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

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch and populate the currencies every 5 seconds
    setInterval(fetchAndPopulateCurrencies, 5000);

    // Prepare the chart context
    priceChart = new Chart(domPriceChart, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: {
                        source: 'data'
                    },
                    distribution: 'series',
                    padding: 0,
                },
                y: {
                    drawBorder: false,
                    display: false,
                    padding: 0
                }
            }
        }
    });

    // With one initial fetch on page load
    await fetchAndPopulateCurrencies();
});
