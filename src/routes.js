const express = require('express');
const router = express.Router();
const { dataSource } = require('./dataSource');
const { readDataSource, readHistoricalDataSource, saveDataSource } = require('./db');

const { getMarketData } = require('./remoteData');
const { filterOutliers } = require('./dataProcessing')

const dataSourceUpdateTime = { //listed in seconds
    coinGecko: 63,
    coinGeckoDirect: 70,
    coinMarketCap: 10,
    binance: 10,
}

/** An optional prefix for the service router: useful if plugging in to an existing Express App */
const ROOT_PREFIX = process.env.ORACLE_ROOT_PREFIX || '';

router.get(ROOT_PREFIX + '/api/v1/historical/:currency', async(req, res)=>{
    // Require a currency parameter
    if (!req.params.currency) return res.status(400).json({ err: 'The "currency" parameter is missing!'});
    const strCurrency = req.params.currency.toLowerCase();

    // Fetch market data from disk
    const arrHistoricalMarketData = await prepareHistoricalMarketData();
    if (arrHistoricalMarketData.length == 0) {
        console.error('Warning: Oracle has no data after multiple attempts, cannot provide data to API requests!');
        return res.status(500).json({ err: "Oracle doesn't have enough data to respond, try again later!" });
    }

    // Grab all prices for the coin with timestamp
    const arrAggregatedPrices = [];
    arrHistoricalMarketData.forEach((cMarketDataLastChecked) => {

        // Save all instances of price data for this currency
        for (const [key, value] of Object.entries(cMarketDataLastChecked.data)) {
            for(const [ticker, tickerPrice] of Object.entries(cMarketDataLastChecked.data[key])){
                if (ticker === strCurrency) {
                    let tickerReturn = {tickerPrice: tickerPrice, timeUpdated: cMarketDataLastChecked.lastUpdated}
                    arrAggregatedPrices.push(tickerReturn);
                }
            }
        }
    });

    // Aggregate prices that are in similar timestamps
    // TODO : FIX THIS SO THAT THE PRICE GETS AGGREGATED ONE TIME.
    // PREFERABLY WHEN IT GETS SAVED ORIGINALLY

    // Round all times by 300 seconds (or 5 minutes) so that everything can be aggregated together
    let roundedArrPrices = arrAggregatedPrices.map(arrAggregatedPrices => ({
            ...arrAggregatedPrices,
            timeUpdated: Math.round(Math.floor(arrAggregatedPrices.timeUpdated/300) * 300)
        })
    );

    // AggregateByTimeStamp
    const groupAverages = (arr, key, val) => {
        const specialAverage = (a, b, i, self) => a + b[val] / self.length;
        return Object.values(
            arr.reduce((acc, elem, i, self) => (
                (acc[elem[key]] = acc[elem[key]] || {
                [key]: elem[key],
                //TODO : NEEDS TO FILTER OUTLIERS A LITTLE BETTER
                [val]: parseFloat(self.filter((x) => x[key] === elem[key]).reduce(specialAverage, 0).toFixed(8)),
                }),acc),{})
        );
    };
    
    const aggregatedTimeStampedPriceData = groupAverages(roundedArrPrices,'timeUpdated','tickerPrice')

    // Check we have any relevant data
    if (aggregatedTimeStampedPriceData.length == 0) return res.status(400).json({ err: `The currency "${strCurrency}" either doesn't exist, or Oracle does not yet have any data for it.` });

    // Return the data!
    res.json({
        currency: strCurrency,
        // Perform outlier filtering, averaging, then rounding
        value: aggregatedTimeStampedPriceData
    });
})

router.get(ROOT_PREFIX + '/api/v1/currencies', async(req, res) =>{
    // Fetch market data from disk
    const arrMarketData = await prepareMarketData();
    if (arrMarketData.length == 0) {
        console.error('Warning: Oracle has no data after multiple attempts, cannot provide data to API requests!');
        return res.status(500).json({ err: "Oracle doesn't have enough data to respond, try again later!" });
    }

    // Aggregate the prices from our various sources
    const arrResponse = [];
    const aggregate = {}
    const aggLastUpdated = {}
    arrMarketData.forEach((marketDataLastChecked) => {
        if (marketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[marketDataLastChecked.dataSourceName]) {
            // Start a data refresh if this looks outdated
            getMarketData(arrMarketData, marketDataLastChecked.dataSourceName, 'usd');
        }

        // Save all instances of price data

        for (const [key, value] of Object.entries(marketDataLastChecked.data)) {
            for(const [ticker, tickerPrice] of Object.entries(marketDataLastChecked.data[key])){
                if (aggregate[ticker]) {
                    aggregate[ticker].push(tickerPrice);
                    if(aggLastUpdated[ticker] < marketDataLastChecked.lastUpdated){
                        aggLastUpdated[ticker] = marketDataLastChecked.lastUpdated
                    }
                } else {
                    aggregate[ticker] = [];
                    aggregate[ticker].push(tickerPrice);
                    aggLastUpdated[ticker] = marketDataLastChecked.lastUpdated
                }
            }
        }
    });

    // Average and format
    for (const [strCurrency, nPrice] of Object.entries(aggregate)) {
        arrResponse.push({
            currency: strCurrency,
            // Perform outlier filtering, averaging, then rounding
            value: parseFloat(average(filterOutliers(nPrice)).toFixed(8)),
            last_updated: aggLastUpdated[strCurrency]
        });
    }
    res.json(arrResponse);
});

router.get(ROOT_PREFIX + '/api/v1/price/:currency', async (req, res) => {
    // Require a currency parameter
    if (!req.params.currency) return res.status(400).json({ err: 'The "currency" parameter is missing!'});
    const strCurrency = req.params.currency.toLowerCase();

    // Fetch market data from disk
    const arrMarketData = await prepareMarketData();
    if (arrMarketData.length == 0) {
        console.error('Warning: Oracle has no data after multiple attempts, cannot provide data to API requests!');
        return res.status(500).json({ err: "Oracle doesn't have enough data to respond, try again later!" });
    }

    // Aggregate the prices from our various sources
    const arrAggregatedPrices = [];
    let nOldestCheck = 0;
    arrMarketData.forEach((cMarketDataLastChecked) => {
        if (cMarketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[cMarketDataLastChecked.dataSourceName]) {
            // Start a data refresh if this looks outdated
            console.log("Updated database: " + cMarketDataLastChecked.dataSourceName);
            getMarketData(arrMarketData, cMarketDataLastChecked.dataSourceName, strCurrency);
        }
        if (cMarketDataLastChecked.lastUpdated > nOldestCheck) nOldestCheck = cMarketDataLastChecked.lastUpdated;

        // Save all instances of price data for this currency
        for (const [key, value] of Object.entries(cMarketDataLastChecked.data)) {
            for(const [ticker, tickerPrice] of Object.entries(cMarketDataLastChecked.data[key])){
                if (ticker === strCurrency) {
                    arrAggregatedPrices.push(tickerPrice);
                }
            }
        }
    });

    // Check we have any relevent data
    if (arrAggregatedPrices.length == 0) return res.status(400).json({ err: `The currency "${strCurrency}" either doesn't exist, or Oracle does not yet have any data for it.` });

    // Return the data!
    res.json({
        currency: strCurrency,
        // Perform outlier filtering, averaging, then rounding
        value: parseFloat(average(filterOutliers(arrAggregatedPrices)).toFixed(8)),
        last_updated: nOldestCheck
    });
});

const average = array => array.reduce((a, b) => a + b) / array.length;

async function prepareMarketData() {
    // Fetch market data from disk
    let arrMarketData = await readDataSource();

    // If there's no market data, we'll fetch it real quick before attempting to respond
    if (arrMarketData.length == 0) {
        console.warn("Price API called without any data in DB, fetching from all sources...");
        await getMarketData(arrMarketData, 'coinGecko','usd');
        await getMarketData(arrMarketData, 'coinGeckoDirect', 'usd')
        await getMarketData(arrMarketData, 'binance','usd');
        await getMarketData(arrMarketData, 'coinMarketCap','usd');
        arrMarketData = await readDataSource();
    }

    return arrMarketData;
}

async function prepareHistoricalMarketData() {
    // Fetch market data from disk
    let arrHistoricalMarketData = await readHistoricalDataSource();

    // If there's no market data, we'll fetch it real quick before attempting to respond
    // if (arrMarketData.length == 0) {
    //     console.warn("Price API called without any data in DB, fetching from all sources...");
    //     await getMarketData(arrMarketData, 'coinGecko','usd');
    //     await getMarketData(arrMarketData, 'coinGeckoDirect', 'usd')
    //     await getMarketData(arrMarketData, 'binance','usd');
    //     await getMarketData(arrMarketData, 'coinMarketCap','usd');
    //     arrMarketData = await readDataSource();
    // }

    return arrHistoricalMarketData;
}

module.exports = router;