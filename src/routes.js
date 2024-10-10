const express = require('express');
const router = express.Router();
const { readDataSource, readHistoricalDataSource } = require('./db');

const { getMarketData } = require('./remoteData');
const { filterOutliers, average } = require('./dataProcessing')

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

    //Because everything else is in seconds and not mili-seconds we will convert for the nStart and nEnd
    //Seconds is the standard when dealing in unix
    const timeInSecondsNow = Date.now() / 1000

    // We typically start at the latest data (now)
    const nStart = Math.abs(Number(req.query.start)) || timeInSecondsNow;

    // And by default, we end after 24h of data (86400 seconds)
    const nEnd = Math.abs(Number(req.query.end) || (timeInSecondsNow - 86400));

    // Fetch market data from disk
    let arrHistoricalMarketData = await readHistoricalDataSource(strCurrency,Math.floor(nStart),Math.floor(nEnd));
    //console.log(arrHistoricalMarketData)
    if (arrHistoricalMarketData.length == 0) {
        console.error('Warning: Oracle has no data after multiple attempts, cannot provide data to API requests!');
        return res.status(500).json({ err: "Oracle doesn't have enough data to respond, try again later!" });
    }

    let returnData = []
    arrHistoricalMarketData.forEach((historical)=>{
        if(historical.ticker == strCurrency){
            returnData.push({timestamp: new Date(historical.timeUpdated).getTime()/1000, value: parseFloat(historical.tickerPrice)})
        }
    })

    // Return the data!
    res.json(
        // Perform outlier filtering, averaging, then rounding
        returnData
    );
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

    // Check we have any relevant data
    if (arrAggregatedPrices.length == 0) return res.status(400).json({ err: `The currency "${strCurrency}" either doesn't exist, or Oracle does not yet have any data for it.` });

    // Return the data!
    res.json({
        currency: strCurrency,
        // Perform outlier filtering, averaging, then rounding
        value: parseFloat(average(filterOutliers(arrAggregatedPrices)).toFixed(8)),
        last_updated: nOldestCheck
    });
});

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

module.exports = router;