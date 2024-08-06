// DOM Cache
const domDropdownContent = document.querySelector('.dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domPrice = document.getElementById('price');
const domTimestamp = document.getElementById('price-updated');
const domPriceChart = document.getElementById('price-chart');
const domTimeScale = document.getElementById('time-scale');

// Globals
let strSelectedCurrency = 'btc';
let priceChart = null;
let timeScale = '24h'; // Default time scale

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
let arrHistorical = [];

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

/** Fetch a currency from cache by name, as well as merged with the local dataset */
function getCurrency(strCurrency) {
    const cAPICurrency = arrPrices.find(a => a.currency === strCurrency);
    const cLocalCurrency = arrCurrencyData.find(a => a.ticker === strCurrency);
    if (cLocalCurrency) {
        return { ...cAPICurrency, ...cLocalCurrency, hasAdditionalData: true};
    } else {
        return { ...cAPICurrency, hasAdditionalData: false };
    }
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

    // Update the "currency dropdown" list
    let strDropdownHTML = ``;
    for (const cCurrency of arrPrices.map(a => getCurrency(a.currency))) {
        // We'll only render currencies included in currencies.js (i.e: currencies with additional data)
        if (!cCurrency.hasAdditionalData) continue;

        // Render this currency in the HTML string
        strDropdownHTML += `
            <a data-value="${cCurrency.ticker}">
                <img src="img/${cCurrency.img}" alt="${cCurrency.ticker}">
                (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
            </a>
        `;
    }
    domDropdownContent.innerHTML = strDropdownHTML;

    // Update chart data
    updatePriceChart();
}

/** Render the Price Chart */
async function updatePriceChart() {
    const chartRes = await fetch(`https://pivxla.bz/oracle/api/v1/historical/${strSelectedCurrency}?scale=${timeScale}`);
    if (chartRes.ok) {
        arrHistorical = await chartRes.json();

        // Completely reset chart data (not efficient, and hard to animate, we should rather pop/shift in the future)
        priceChart.data.labels = [];
        priceChart.data.datasets[0] = {
            data: [],
            fill: false,
            borderColor: "#8e44ad", // Purple line
            pointBackgroundColor: "white", // Purple data points
            pointBorderColor: "#8e44ad", // Purple border for data points
            lineTension: 0.2,
            borderWidth: 3
        };
        // Convert the historical data in to Chart Data
        for (const cPoint of arrHistorical) {
            // Push the "Time" label of each data point
            priceChart.data.labels.push(fromEpochtoTime(cPoint.timestamp));
            // Push the value (price) of each data point
            priceChart.data.datasets[0].data.push(cPoint.value);
        }

        // Push "now" in to the chart, to make it completely real-time
        const cCurrency = getCurrency(strSelectedCurrency);
        priceChart.data.labels.push('Now');
        priceChart.data.datasets[0].data.push(cCurrency.value);

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
                domDropdownContent.style.display = 'none';
                updateDisplay();
            }
        });
    } catch (error) {
        console.error('Fetching failed:');
        console.error(error);
    }
}

/** Set up listeners for dropdown and time scale selection */
function setupDropdownListeners() {
    // Time scale change listener
    domTimeScale.addEventListener('change', (e) => {
        timeScale = e.target.value;
        updatePriceChart();
    });

    // Currency dropdown listener
    domDropdownContent.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target) {
            e.preventDefault();
            strSelectedCurrency = target.dataset.value;
            domDropdownBtn.innerHTML = target.innerHTML;
            domDropdownContent.style.display = 'none';
            updateDisplay();
        }
    });
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
                fill: false,
                borderColor: "white",
                lineTension: 0.2,
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
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
                    display: true, // Enable display for y-axis
                    padding: 0,
                    ticks: {
                        callback: function(value) {
                            // Show actual numbers
                            return value;
                        }
                    }
                }
            }
        }
    });

    // With one initial fetch on page load
    await fetchAndPopulateCurrencies();

    // Once the dropdown is populated, it's safe to enable the listeners!
    setupDropdownListeners();
});
