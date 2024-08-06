// DOM Cache
const domDropdownContainer = document.getElementById('dropdown-container');
const domDropdownContent = document.getElementById('dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domDropdownSearch = document.getElementById('dropdown-search');
const domPrice = document.getElementById('price');
const domTimestamp = document.getElementById('price-updated');
const domPriceChart = document.getElementById('price-chart');
const domTimeScale = document.getElementById('time-scale');

// Globals
let strSelectedCurrency = 'btc';
let priceChart = null;
let timeScale = 86400; // Default time scale is 24h

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
 * Converts a Unix Epoch to a Locale Date String
 * @param {number} epochTime - the unix epoch
 */
function fromEpochToDate(epochTime) {
    return new Date(epochTime * 1000).toLocaleDateString();
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

/** Render the currency list, including any search query */
function updateCurrencyList() {
    let strDropdownHTML = ``;
    for (const cCurrency of arrPrices.map(a => getCurrency(a.currency))) {
        // We'll only render currencies included in currencies.js (i.e: currencies with additional data)
        if (!cCurrency.hasAdditionalData) continue;

        // We'll also only render currencies searched for, if a search is active
        const strSearch = domDropdownSearch.value.toLowerCase();
        if (strSearch && !cCurrency.ticker.includes(strSearch) && !cCurrency.name.toLowerCase().includes(strSearch)) continue;

        // Render this currency in the HTML string
        strDropdownHTML += `
            <a data-value="${cCurrency.ticker}">
                <img src="img/${cCurrency.img}" alt="${cCurrency.ticker}">
                (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
            </a>
        `;
    }
    domDropdownContent.innerHTML = strDropdownHTML;
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
    updateCurrencyList();

    // Update chart data
    updatePriceChart();
}

/** Fetches and renders chart data for the user-selected currency and time scale */
async function updatePriceChart() {
    const chartRes = await fetch(`https://pivxla.bz/oracle/api/v1/historical/${strSelectedCurrency}?end=${Math.round(Date.now() / 1000) - timeScale}`);
    if (chartRes.ok) {
        arrHistorical = await chartRes.json();

        // Completely reset chart data
        priceChart.data.labels = [];
        priceChart.data.datasets[0] = {
            data: [],
            fill: true, // Ensure the area under the line is filled
            backgroundColor: priceChart.data.datasets[0].backgroundColor, // Apply gradient fill
            borderColor: "#8e44ad", // Purple line color
            pointBackgroundColor: "white", // Purple data points
            pointBorderColor: "#8e44ad", // Purple border for data points
            lineTension: 0.2,
            borderWidth: 3
        };

        // Apply some data-crunching when using >24h time scales
        if (timeScale > 86400) {
            // Compute how many points to skip in order to keep a 24-point chart
            const nSkip = Math.floor(arrHistorical.length / 24);

            // Filter out the average of the skippable points
            arrHistorical = arrHistorical.filter((_, i) => i % nSkip === 0);
        }

        // Convert the historical data into Chart Data
        for (const cPoint of arrHistorical) {
            // Push the "Date" label of each data point
            priceChart.data.labels.push(fromEpochToDate(cPoint.timestamp));
            // Push the value (price) of each data point
            priceChart.data.datasets[0].data.push(cPoint.value);
        }

        // Push "now" into the chart, to make it completely real-time
        const cCurrency = getCurrency(strSelectedCurrency);
        priceChart.data.labels.push('Now');
        priceChart.data.datasets[0].data.push(cCurrency.value);

        // Update the chart and animate the transition
        priceChart.update({
            duration: 800, // Animation duration in milliseconds
            easing: 'easeInOutQuad' // Animation easing function
        });
    }
}

/** A UI handler to accept Time Scale updates from the frontend */
function uiChangeTimeScale(evt) {
    timeScale = evt.value;
    updatePriceChart();
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
                domDropdownContainer.style.display = 'none';
                updateDisplay();
            }
        });
    } catch (error) {
        console.error('Fetching failed:');
        console.error(error);
    }
}

/** Set up dropdown listener */
function setupDropdownListeners() {
    // Currency dropdown listener
    domDropdownContent.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target) {
            e.preventDefault();
            strSelectedCurrency = target.dataset.value;
            domDropdownBtn.innerHTML = target.innerHTML;
            domDropdownContainer.style.display = 'none';
            updateDisplay();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // Prepare the chart context
    const ctx = domPriceChart.getContext('2d');
    
    // Create a neon purple gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400); // Adjust the gradient dimensions as needed
    gradient.addColorStop(0, 'rgba(142, 68, 173, 0.7)'); // Darker neon purple at the bottom
    gradient.addColorStop(1, 'rgba(142, 68, 173, 0)');   // Fully transparent at the top

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                fill: true, // Ensure the area under the line is filled
                backgroundColor: gradient, // Apply gradient fill
                borderColor: "#8e44ad", // Purple line color
                pointBackgroundColor: "white", // White data points
                pointBorderColor: "#8e44ad", // Purple border for data points
                lineTension: 0.2,
                borderWidth: 3
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
                    time: {
                        unit: 'day'
                    }
                },
                y: {
                    drawBorder: false,
                    display: true, // Enable display for y-axis
                    padding: 0,
                    ticks: {
                        stepSize: 5, // Difference of 5 units
                        callback: function(value) {
                            // Show actual numbers
                            return n(value);
                        }
                    }
                }
            }
        }
    });

    // With one initial fetch on page load
    await fetchAndPopulateCurrencies();

    // For the multi-cultural funsies, we'll populate the search placeholder with a random currency...
    domDropdownSearch.placeholder = arrCurrencyData[Math.floor(Math.random() * arrCurrencyData.length + 1)].name + '...';

    // Once the dropdown is populated, it's safe to enable the listeners!
    setupDropdownListeners();
});
