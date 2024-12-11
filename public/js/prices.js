// DOM Cache
const domDropdownContainer = document.getElementById('dropdown-container');
const domDropdownContent = document.getElementById('dropdown-content');
const domDropdownBtn = document.querySelector('.dropdown-btn');
const domDropdownSearch = document.getElementById('dropdown-search');
const domPrice = document.getElementById('price');
/** @type {HTMLCanvasElement} */
const domPriceChart = document.getElementById('price-chart');
const domTimeScaleDropdown = document.getElementById('time-scale-btn');
const domTimeScaleDefault = document.getElementById('time-scale-default');
const domTimeScaleDropdownContent = document.querySelector('.time-scale-dropdown-content');
const domSelectedCurrencyAmount = document.getElementById('selected-currency-amount');
const domSelectedCurrencyLabel = document.getElementById('selected-currency-label');

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
    // If there's no API currency... we can forget it for now
    if (!cAPICurrency) return null;

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
        // Note: the first in the list gets a highlight for the search focus!
        const fHighlight = !strDropdownHTML.length && domDropdownSearch.value.length;
        strDropdownHTML += renderCurrencyButton(cCurrency, false, fHighlight);

        // If this is our selected currency, we also update the primary dropdown button
        if (strSelectedCurrency === cCurrency.ticker) {
            domDropdownBtn.innerHTML = renderCurrencyButton(cCurrency, true);
        }
    }
    domDropdownContent.innerHTML = strDropdownHTML;
}

/** Renders a Currency in to a HTML representation */
function renderCurrencyButton(cCurrency, fNoButton = false, fHighlight = false) {
    if (fNoButton) {
        return `<img src="img/${cCurrency.ticker}.png" alt="${cCurrency.ticker}"> (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
        `;
    } else {
        return `
            <a data-value="${cCurrency.ticker}" ${fHighlight ? 'style="background-color: #c687f4"' : ''}>
                <img src="img/${cCurrency.ticker}.png" alt="${cCurrency.ticker}">
                (${cCurrency.ticker.toUpperCase()}) ${cCurrency.name}
            </a>
        `;
    }
}

/** A cache for the last displayed currency, used for in-between update animations */
let strLastDisplayedCurrency = '';

/** Render the state */
function updateDisplay() {
    // Check against our last currency, so we know if an animation is warrented
    const fAnimate = strLastDisplayedCurrency !== strSelectedCurrency;
    strLastDisplayedCurrency = strSelectedCurrency;

    // Update the Price UI
    const cCurrency = getCurrency(strSelectedCurrency);
    domPrice.innerText = `${cCurrency.value} ${cCurrency.currency.toUpperCase()}`;

    // Update the calculator "Currency" placeholder
    domCurInput.placeholder = cCurrency.currency.toUpperCase();

    // Update the floating label for the selected currency input
    domSelectedCurrencyLabel.innerText = cCurrency.currency.toUpperCase();

    // If a PIV value is specified, update the conversion too
    if (domPIVInput.value) convertCurrency(domPIVInput.value, strSelectedCurrency, true);

    // Update the "currency dropdown" list
    updateCurrencyList();

    // Update chart data
    updatePriceChart(fAnimate);
}

/** Fetches and renders chart data for the user-selected currency and time scale */
async function updatePriceChart(fAnimate = false) {
    const chartRes = await fetch(`${baseURL}/api/v1/historical/${strSelectedCurrency}?end=${Math.round(Date.now() / 1000) - timeScale}`);
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

        // Reset chart scaling range (to be computed below)
        nChartRangeMin = Number.MAX_SAFE_INTEGER;
        nChartRangeMax = 0;

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

            // Calculate min/max price values for proper chart scaling
            if (cPoint.value > nChartRangeMax) nChartRangeMax = cPoint.value;
            if (cPoint.value < nChartRangeMin) nChartRangeMin = cPoint.value;
        }

        // Fetch the current price for real-time data integration
        const cCurrency = getCurrency(strSelectedCurrency);

        // One last min/max calc just in case of real-time spikes - then set it as the global value
        if (cCurrency.value > nChartRangeMax) nChartRangeMax = cCurrency.value;
        if (cCurrency.value < nChartRangeMin) nChartRangeMin = cCurrency.value;
        priceChart.options.scales.y.min = nChartRangeMin;
        priceChart.options.scales.y.max = nChartRangeMax;

        // Push "now" into the chart, to make it completely real-time
        priceChart.data.labels.push('Now');
        priceChart.data.datasets[0].data.push({
            x: Math.round(Date.now() / 1000), // current timestamp
            y: cCurrency.value,
            timestamp: Math.round(Date.now() / 1000)
        });

        // Update the chart and animate the transition
        priceChart.update(!fAnimate ? 'none' : {
            duration: 800, // Animation duration in milliseconds
            easing: 'easeInOutQuad' // Animation easing function
        });
    }
}

/* The UI handler for accepting changes from the Time Scale dropdown */
function selectTimeScale(element) {
    // Update the button text and value
    domTimeScaleDropdown.innerHTML = element.innerHTML;

    // Hide the dropdown
    domTimeScaleDropdownContent.style.display = 'none';

    // Grab the scale from the element and update the chart
    timeScale = Number(element.getAttribute('data-value'));
    if (!fFirstLoad) {
        updatePriceChart(true);
    }
}

/** Change the selected currency */
function selectCurrency(strCurrency) {
    strSelectedCurrency = strCurrency;
    domDropdownBtn.innerHTML = domDropdownBtn.innerHTML = renderCurrencyButton(getCurrency(strSelectedCurrency), true);
    domDropdownContainer.style.display = 'none';
    window.history.pushState(null, '', '?currency=' + strSelectedCurrency);
    updateDisplay();
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

        fFirstLoad = false;
    } catch (error) {
        console.error('Fetching failed:');
        console.error(error);
    }
}

/** UI handler to toggle dropdown states */
function toggleDropdown(dropdown) {
    // Save the current dropdown state, so we can flip it
    const isOpen = dropdown.style.display === 'block';

    // Close all dropdowns
    domDropdownContainer.style.display = 'none';
    domTimeScaleDropdownContent.style.display = 'none';

    // Flip the state of the dropdown
    dropdown.style.display = isOpen ? 'none' : 'block';
}

/** Set up dropdown listener */
function setupDropdownListeners() {
    // Currency dropdown clicks
    domDropdownBtn.addEventListener('click', () => {
        toggleDropdown(domDropdownContainer);
        // If the dropdown is opened, focus the cursor on the search input
        if (domDropdownContainer.style.display === 'block') {
            domDropdownSearch.focus();
        }
    });

    // Time Scale dropdown clicks
    domTimeScaleDropdown.addEventListener('click', () => {
        toggleDropdown(domTimeScaleDropdownContent);
    });

    // UI listener for selecting currencies
    domDropdownContent.addEventListener('click', function (e) {
        const target = e.target.closest('a');
        if (target) {
            e.preventDefault();
            selectCurrency(target.dataset.value);
        }
    });

    // Allow "confirming" search result selection when the user is searching
    domDropdownSearch.addEventListener('keyup', (e) => {
        if (e.keyCode === 13) { // Enter Key
            // Check if a valid result exists, and if so... select it
            if (domDropdownContent.childElementCount) {
                selectCurrency(domDropdownContent.children[0].getAttribute('data-value'));
                domDropdownSearch.blur();
            }
        }
    });

    // Close all custom dropdowns when clicks outside of 'em are spotted
    document.addEventListener('click', function(event) {
        const target = event.target;
        if (!domDropdownBtn.contains(target) && !domDropdownContainer.contains(target)) {
            domDropdownContainer.style.display = 'none';
        }
        if (!domTimeScaleDropdown.contains(target) && !domTimeScaleDropdownContent.contains(target)) {
            domTimeScaleDropdownContent.style.display = 'none';
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

/** The minimum scale displayed by the chart - updated by updatePriceChart() */
let nChartRangeMin = Number.MAX_SAFE_INTEGER;
/** The maximum scale displayed by the chart - updated by updatePriceChart() */
let nChartRangeMax = 0;

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

    // Set default Time Scale selection
    selectTimeScale(domTimeScaleDefault);

    // With one initial fetch on page load
    await fetchAndPopulateCurrencies();

    // And a repeated fetch every 10 seconds
    setInterval(fetchAndPopulateCurrencies, 10000);

    // For the multi-cultural funsies, we'll populate the search placeholder with a random currency...
    domDropdownSearch.placeholder = 'Search for ' + arrCurrencyData[Math.floor(Math.random() * arrCurrencyData.length)].name + '...';

    // Once the dropdown is populated, it's safe to enable the listeners!
    setupDropdownListeners();
});
