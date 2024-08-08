// DOM Cache
const domDropdownContainer = document.getElementById('dropdown-container');
const domDropdownContent = document.getElementById('dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domDropdownSearch = document.getElementById('dropdown-search');
const domPrice = document.getElementById('price');
/** @type {HTMLCanvasElement} */
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
    const cDate = new Date(epochTime * 1000);
    // 'en-GB' locale gives it to us in day-month-year
    return cDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** 
 * Converts a Unix Epoch to a Time String
 * @param {number} epochTime - the unix epoch
 */
function fromEpochToTime(epochTime) {
    const date = new Date(epochTime * 1000);
    // Shave off the seconds
    return date.toTimeString().split(' ')[0].slice(0, 5);
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
        strDropdownHTML += renderCurrencyButton(cCurrency);

        // If this is our selected currency, we also update the primary dropdown button
        if (strSelectedCurrency === cCurrency.ticker) {
            domDropdownBtn.innerHTML = renderCurrencyButton(cCurrency, true);
        }
    }
    domDropdownContent.innerHTML = strDropdownHTML;
}

/** Renders a Currency in to a HTML representation */
function renderCurrencyButton(cCurrency, fNoButton = false) {
    if (fNoButton) {
        return `<img src="img/${cCurrency.img}" alt="${cCurrency.ticker}"> (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
        `;
    } else {
        return `
            <a data-value="${cCurrency.ticker}">
                <img src="img/${cCurrency.img}" alt="${cCurrency.ticker}">
                (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
            </a>
        `;
    }
}

/** Render the state */
function updateDisplay() {
    // Update the Price UI
    const cCurrency = getCurrency(strSelectedCurrency);
    domPrice.innerText = `${cCurrency.value} ${cCurrency.currency.toUpperCase()}`;

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
        priceChart.data.datasets[0] = getChartDataset();

        // Apply some data-crunching when using >24h time scales
        if (timeScale > 86400) {
            // Compute how many points to skip in order to keep a 24-point chart
            const nSkip = Math.floor(arrHistorical.length / 24);

            // Filter out the average of the skippable points
            arrHistorical = arrHistorical.filter((_, i) => i % nSkip === 0);
        }

        // Convert the historical data into Chart Data
        for (const cPoint of arrHistorical) {
            // Check if this point is within the last 24h, and select the Epoch function accordingly
            const fWithinDay = (Date.now() / 1000) - cPoint.timestamp < 86400;
            const funcEpochConverter = fWithinDay ? fromEpochToTime : fromEpochToDate;

            // Push the "Date" label of each data point
            priceChart.data.labels.push(funcEpochConverter(cPoint.timestamp));

            // Push the value (price) of each data point
            priceChart.data.datasets[0].data.push({
                x: cPoint.timestamp, // x value for time axis
                y: cPoint.value,     // y value for the price
                timestamp: cPoint.timestamp // add timestamp for tooltip
            });
        }

        // Push "now" into the chart, to make it completely real-time
        const cCurrency = getCurrency(strSelectedCurrency);
        priceChart.data.labels.push('Now');
        priceChart.data.datasets[0].data.push({
            x: Math.round(Date.now() / 1000), // current timestamp
            y: cCurrency.value,
            timestamp: Math.round(Date.now() / 1000)
        });


        // Update the chart and animate the transition
        priceChart.update({
            duration: 800, // Animation duration in milliseconds
            easing: 'easeInOutQuad' // Animation easing function
        });
    }
}

/** A UI handler to accept Time Scale updates from the frontend */
function uiChangeTimeScale(evt) {
    timeScale = Number(evt.value);
    updatePriceChart();
}

/** A flag to determine first-load; used for init-only tasks */
let fFirstLoad = true;

/** Fetch and cache all necessary data */
async function fetchAndPopulateCurrencies() {
    try {
        const response = await fetch(`${baseURL}/api/v1/currencies`);
        if (!response.ok) return console.error(`HTTP error! status: ${response.status}`);

        // All data for all currencies available gets fetched and cached
        arrPrices = await response.json();

        // If it's first load, and the user requested a currency, load it!
        if (fFirstLoad) {
            const cParams = new URLSearchParams(window.location.search);
            const strUserCurrency = cParams.get('currency')?.toLowerCase();
            if (strUserCurrency) {
                const cCurrency = getCurrency(strUserCurrency);
                if (cCurrency) {
                    strSelectedCurrency = strUserCurrency.toLowerCase();
                }
            }
        }

        // If a currency is selected, re-render it's data!
        if (strSelectedCurrency) updateDisplay();

        // UI listener for selecting currencies
        domDropdownContent.addEventListener('click', function (e) {
            const target = e.target.closest('a');
            if (target) {
                e.preventDefault();
                strSelectedCurrency = target.dataset.value;
                domDropdownBtn.innerHTML = domDropdownBtn.innerHTML = renderCurrencyButton(getCurrency(strSelectedCurrency), true);
                window.history.pushState(null, '', '?currency=' + strSelectedCurrency);
                domDropdownContainer.style.display = 'none';
                updateDisplay();
            }
        });

        fFirstLoad = false;
    } catch (error) {
        console.error('Fetching failed:');
        console.error(error);
    }
}

/** Set up dropdown listener */
function setupDropdownListeners() {
    // Currency dropdown clicks
    document.querySelector('.dropdown-btn').addEventListener('click', () => {
        domDropdownContainer.style.display = domDropdownContainer.style.display === 'block' ? 'none' : 'block';
        // If the dropdown is opened, focus the cursor on the search input
        if (domDropdownContainer.style.display === 'block') {
            domDropdownSearch.focus();
        }
    });
}

/** A cache for the chart gradient */
let cGradient = null;

/** Get the default, empty chart dataset */
function getChartDataset() {
    return {
        data: [],
        fill: true, // Ensure the area under the line is filled
        backgroundColor: cGradient, // Apply gradient fill
        borderColor: "rgba(206, 28, 232, 0.5)", // Purple line color
        pointBackgroundColor: "white", // White data points
        pointBorderColor: "rgba(206, 28, 232, 0.4)", // Purple border for data points
        lineTension: 0.2,
        borderWidth: 3,
        radius: 3,
        hitRadius: 100
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Prepare the chart context
    const ctx = domPriceChart.getContext('2d');

    // Create a subtle purple gradient
    cGradient = ctx.createLinearGradient(0, 40, 0, 125);
    cGradient.addColorStop(0, "rgba(206, 28, 232, 0.5)");
    cGradient.addColorStop(1, "transparent");

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [ getChartDataset() ]
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
                    grid: {
                        color: 'rgba(0, 0, 0, 0)', // Faint purple color for grid lines
                        borderColor: 'rgba(206, 28, 232, 0.2)', // Light border color
                        borderDash: [5, 5], // Dashed grid lines
                        drawBorder: false // Hide border
                    },
                    ticks: {
                        color: 'rgba(206, 28, 232, 1)' // Bright purple color for x-axis ticks
                    },
                    distribution: 'series',
                    padding: 0,
                    time: {
                        unit: 'timeScale',
                    }
                },
                y: {
                    drawBorder: false,
                    display: true, // Enable display for y-axis
                    grid: {
                        color: 'rgba(206, 28, 232, 0.1)', // Faint purple color for grid lines
                        borderColor: 'rgba(206, 28, 232, 0.2)', // Light border color
                        borderDash: [5, 5], // Dashed grid lines
                    },
                    ticks: {
                        stepSize: 5, // Difference of 5 units
                        color: 'rgba(206, 28, 232, 1)', // Bright purple color for y-axis ticks
                        callback: function(value) {
                            return n(value); // Format numbers
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
