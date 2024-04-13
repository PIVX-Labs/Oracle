const express = require('express');
const router = express.Router();
const { dataSource } = require('./dataSource');
const { readDataSource, saveDataSource } = require('./db');

const { getMarketData } = require('./remoteData');
const { filterOutliers } = require('./dataProcessing')

const dataSourceUpdateTime = { //listed in seconds
    coinGecko: 25,
    coinGeckoDirect: 35,
    coinMarketCap: 10,
    binance: 10,
}

/** An optional prefix for the service router: useful if plugging in to an existing Express App */
const ROOT_PREFIX = process.env.ORACLE_ROOT_PREFIX || '';

router.get(ROOT_PREFIX + '/api/v1/currencies', async(req, res) =>{
    
    //create marketData array
    let marketData = []
    //load marketData
    const arrPersistentDataSource = await readDataSource();
    for (const dataSource of arrPersistentDataSource) {
        marketData.push(dataSource);
    }

    let response = []
    const average = array => array.reduce((a, b) => a + b) / array.length;

    //if marketData isn't set up
    if(marketData.length == 0){
        console.log("ran no db")
        await getMarketData(marketData, 'coinGecko','usd');
        await getMarketData(marketData, 'coinGeckoDirect', 'usd')
        await getMarketData(marketData, 'binance','usd');
        await getMarketData(marketData, 'coinMarketCap','usd');
    }else{
        //(list of possible currencies alongside the number)
        marketData.forEach((marketDataLastChecked) => {
            if(marketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[marketDataLastChecked.dataSourceName]){
                //If the lastupdated time is to out of date run an async to update it
                //console.log("Updated database: " + marketDataLastChecked.dataSourceName)
                getMarketData(marketData, marketDataLastChecked.dataSourceName,'usd');
            }
            //average the price
            let aggregate = {}
            for (const [key, value] of Object.entries(marketDataLastChecked.data)) {
                for(const [ticker, tickerPrice] of Object.entries(marketDataLastChecked.data[key])){
                    if(aggregate[ticker]){
                        aggregate[ticker].push(tickerPrice)
                    }else{
                        aggregate[ticker] = []
                        aggregate[ticker].push(tickerPrice)
                    }
                }

            }
            for (const [key, value] of Object.entries(aggregate)){
                let jsonFormat = {}
                jsonFormat.currency = key
                //filter outliers
                let outliers = filterOutliers(value)
                //avg and set the price value
                jsonFormat.value = parseFloat(average(outliers).toFixed(8))
                jsonFormat.last_updated = marketDataLastChecked.lastUpdated
                response.push(jsonFormat)
            }
        })
    }
    res.json(response)
});

router.get(ROOT_PREFIX + '/api/v1/price/:currency', async(req,res) =>{

    //create marketData array
    let marketData = []
    //load marketData
    const arrPersistentDataSource = await readDataSource();
    for (const dataSource of arrPersistentDataSource) {
        marketData.push(dataSource);
    }

    //return a single currency
    let response = []
    const average = array => array.reduce((a, b) => a + b) / array.length;

    //if marketData isn't set up
    if(marketData.length == 0){
        console.log("ran no db")
        await getMarketData(marketData, 'coinGecko','usd');
        await getMarketData(marketData, 'coinGeckoDirect', 'usd')
        await getMarketData(marketData, 'binance','usd');
        await getMarketData(marketData, 'coinMarketCap','usd');
    }else{
        let aggregate = {}
        let oldestCheck = 0
        //Look through our db finding anything that matches the currency provided, Take all the values and add them up then return the avg with removed outliers
        marketData.forEach((marketDataLastChecked) => {
            if(marketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[marketDataLastChecked.dataSourceName]){
                //If the lastupdated time is to out of date run an async to update it
                console.log("Updated database: " + marketDataLastChecked.dataSourceName)
                getMarketData(marketData, marketDataLastChecked.dataSourceName,req.params.currency);
            }
            if (marketDataLastChecked.lastUpdated > oldestCheck){oldestCheck = marketDataLastChecked.lastUpdated}
            //average the price

            for (const [key, value] of Object.entries(marketDataLastChecked.data)) {
                for(const [ticker, tickerPrice] of Object.entries(marketDataLastChecked.data[key])){
                    if(ticker == req.params.currency){
                        if(aggregate[ticker]){
                            aggregate[ticker].push(tickerPrice)
                        }else{
                            aggregate[ticker] = []
                            aggregate[ticker].push(tickerPrice)
                        }
                    }
                }
            }
        })
        for (const [key, value] of Object.entries(aggregate)){

            let jsonFormat = {}
            jsonFormat.currency = key
            //filter outliers
            let outliers = filterOutliers(value)
            //avg and set the price value
            jsonFormat.value = parseFloat(average(outliers).toFixed(8))
            jsonFormat.last_updated = oldestCheck
    
            response.push(jsonFormat)
        }
    }
    res.json(response)
});

module.exports = router;