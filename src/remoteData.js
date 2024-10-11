const https = require('https');

//DATABASE
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/Oracle');
const { readDataSource, readHistoricalDataSource,getNewestTimeStampHistoricalData, saveDataSource, saveHistoricalData, updateOrCreateDataSource } = require('./db');
const DataSourceDataSchema = require('../models/DataSourceData');

const { filterOutliers, average } = require('./dataProcessing')

let coinMarketCapApiKey = process.env.CMC_KEY;
let ticker = process.env.TICKER || 'pivx';

// Time listed in seconds (default 3600)
const historicalSnapshotTime = process.env.HISTORICAL_SNAPSHOT_TIME || 3600
const autoUpdateInterval = process.env.AUTO_UPDATE || 300


/**
 * Checks the time from the last checks of our data sources updates them if need be, and returns the data the users need
 * @param {string} baseCurrency - The currency ticker that we want against pivx if none passed we will return everything we have
 */
async function getMarketData(marketData, dataSource, baseCurrency){
    // Get the last update from each of the data sources
    if (dataSource == 'coinGecko'){
        let coinGeckoDirectDataStored = await DataSourceDataSchema.findOne({ dataSourceName: 'coinGeckoDirect' }).exec();
        if(coinGeckoDirectDataStored.enabled){
            let coinGeckoData = await getDataCoinGecko(marketData, baseCurrency)
            // Average the price in coinGecko
            if(coinGeckoData){
            }else{
                console.log("issue with coinGeckoData: ")
                //const updateDataSourceMongo = await DataSourceDataSchema.updateOne({ dataSourceName: 'coinGeckoDirect'},{enabled : false})
            }
        }
    }

    if (dataSource == 'coinGeckoDirect'){
        let coinGeckoDirectDataStored = await DataSourceDataSchema.findOne({ dataSourceName: 'coinGeckoDirect' }).exec();
            if(coinGeckoDirectDataStored.enabled){
            let coinGeckoDirectData = await getDataCoinGeckoDirect(marketData, baseCurrency)
            // Average the price in coinGeckoDirect
            if(coinGeckoDirectData){
            }else{
                console.log("issue with coinGeckoDirectData: " + coinGeckoDirectData)
                //const updateDataSourceMongo = await DataSourceDataSchema.updateOne({ dataSourceName: 'coinGeckoDirect'},{enabled : false})
            }
        }
    }

    if (dataSource == 'binance'){
        //check if enabled
        let binanceDataStored = await DataSourceDataSchema.findOne({ dataSourceName: 'binance' }).exec();
        if(binanceDataStored.enabled){
            let binanceData = await getDataBinance(marketData, baseCurrency)
            if(binanceData.msg == "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms. Please contact customer service if you believe you received this message in error."){
                console.log("bad region, binance won't give data, Disabling")
                //const updateDataSourceMongo = await DataSourceDataSchema.updateOne({ dataSourceName: 'binance'},{enabled : false})
            }else{
            }
        }
    }
    if (dataSource == 'coinMarketCap'){
        let coinMarketCapDataStored = await DataSourceDataSchema.findOne({ dataSourceName: 'coinMarketCap' }).exec();
        if(coinMarketCapDataStored.enabled){
            let CoinMarketCapData = await getDataCoinMarketCap(marketData, baseCurrency)
            if(CoinMarketCapData.data){
            }else{
                console.log("Coin Market Cap not working, Disabling")
                const updateDataSourceMongo = await DataSourceDataSchema.updateOne({ dataSourceName: 'coinMarketCap'},{enabled : false})
            }
        }
    }
}

/**
 * Allows you to get all the marketData from a data Source
 * @param {string} dataSourceNamePassed // The name of the data source
 * @returns 
 */
async function getMarketDataSource(marketData, dataSourceNamePassed){
    return marketData.find(dataSource => dataSource.dataSourceName === dataSourceNamePassed);
}

/**
 * Updates a data source with new data
 * @param {string} dataSource 
 * @param {object} data 
 * @param {int} updateTime 
 */
async function updateDataSource(marketData,dataSource,data,updateTime){
    dataSource.data = data;
    dataSource.lastUpdated = updateTime;

    await saveDataSource(marketData);

    let newestAddition = await getNewestTimeStampHistoricalData()

    if(newestAddition < Math.floor((new Date().getTime() / 1000) - historicalSnapshotTime)){
    console.log("New snapshot time")
        // Grab all prices for the coin with timestamp
        const arrAggregatedPrices = [];
        marketData.forEach((cMarketDataLastChecked) => {
            // Save all instances of price data for this currency
            for (const [key, value] of Object.entries(cMarketDataLastChecked.data)) {
                for(const [ticker, tickerPrice] of Object.entries(cMarketDataLastChecked.data[key])){
                    let tickerReturn = {ticker: ticker, tickerPrice: tickerPrice}
                    arrAggregatedPrices.push(tickerReturn);
                }
            }
        });

        // Reduce the array object
        const priceObject ={}

        aggResult = arrAggregatedPrices.reduce(function (r, a) {
            r[a.ticker] = r[a.ticker] || [];
            r[a.ticker].push(a.tickerPrice);
            return r;
        },Object.create(priceObject));
    

        // Loop through the array object to filter the outliers and average
        let aggregatedAndOutlierFiltered = []
        let curTimeForSettingThePriceData = Math.floor(new Date().getTime() / 1000)
        for (const [ticker, groupTickerPrice] of Object.entries(aggResult)) {
            let filteredDataReturn = {ticker: ticker, tickerPrice: parseFloat(average(filterOutliers(groupTickerPrice)).toFixed(8)), timeUpdated: curTimeForSettingThePriceData}
            aggregatedAndOutlierFiltered.push(filteredDataReturn)
        }

        await saveHistoricalData(aggregatedAndOutlierFiltered)
        console.log("Updated Historical Data")
    }
}

/**
 * System to send get requests to an external server
 * @param {string} url 
 * @returns 
 */
async function getData(url){
    return new Promise((resolve) => {
        https.get(url, (resp)=>{
            let data = '';
            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                data += chunk;
            });
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                try {
                    let json = JSON.parse(data);
                    // return the JSON
                    resolve(json)
                } catch (error) {
                    console.error(error.message);
                    resolve(data)
                };
                
            });
            
            }).on("error", (err) => {
                if(err.name == "AggregateError"){
                    // This is most likely to occur when coingecko refuses to respond mainly to the `v3/coins/pivx?localization=` endpoint
                    console.log("AggregateError - most likely coingecko is overloaded")
                    resolve("error:Ag")
                }else{
                    console.log("Error: " + err);
                }


            });
    })
}

/**
 * Gets the coin market cap data
 * @returns 
 */
async function getDataCoinMarketCap(marketData,baseCurrency){
    // format input data and output in a known format for the rest of the program
    let url = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?CMC_PRO_API_KEY="+coinMarketCapApiKey+"&slug="+ ticker
    return await getData(url)
}

/**
 * grabs price ticker data from binance
 * @param {string} baseCurrency 
 * @returns 
 */
async function getDataBinance(marketData, baseCurrency){
    // format input data and output in a known format for the rest of the program
    // use USDT as Binance doesn't do just straight usd
    if (baseCurrency == 'usd'){baseCurrency = 'usdt'}
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol='+ ticker.toUpperCase() + baseCurrency.toUpperCase()
   
    let data = await getData(url)

    let binanceReturnData = {}
    binanceReturnData['binance'] = {}
    if(data.symbol){
        let dbSymbol = data.symbol.replace("PIVX","").toLowerCase()
        binanceReturnData.binance[`${dbSymbol}`] = data.price
    }
    let dataFromDisk = await getMarketDataSource(marketData,"binance")
    // check if binance returned what we think it should
    if(data.price){

        // Check if binance is in the db
        if(dataFromDisk === undefined){
            let binanceReturnData = {
                'binance':{}
            }
            // If binance is not in the db create it
            const binanceData = new dataSource("binance",binanceReturnData,Math.floor(new Date().getTime() / 1000))
            // check if dataSource already exists

            await updateOrCreateDataSource(binanceData)
        }else{
            updateDataSource(marketData, dataFromDisk, binanceReturnData, Math.floor(new Date().getTime() / 1000))

        }
    // something went wrong with binance
    }else{
        // Check if binance exists in the local db
        if(dataFromDisk === undefined){
            let binanceReturnData = {
                'binance':{}
            }
            // If binance is not in the db create it
            const binanceData = new dataSource("binance",binanceReturnData,Math.floor(new Date().getTime() / 1000))
            // Check if dataSource already exists

            updateOrCreateDataSource(binanceData)

            // marketData.push(binanceData)
            // saveDataSource(marketData)
        }else{
            // something went wrong with the binance call but we should still update the time it was last checked to stop spam api calls
            let binanceReturnData = await getMarketDataSource(marketData, 'binance')
            updateDataSource(marketData, dataFromDisk, binanceReturnData.data, Math.floor(new Date().getTime() / 1000))
        }
    }
    return await getData(url)
}


/**
 * Gets information from coin gecko about markets
 * @param {string} baseCurrency 
 * @returns 
 */
async function getDataCoinGecko(marketData, baseCurrency){
    // Format input data and output in a known format for the rest of the program
    // Check what the base currency is
    let url = 'https://api.coingecko.com/api/v3/coins/'+ticker+'/tickers'
    let data = await getData(url)
    if(data.tickers){
        let coinGeckoReturnData = {}
        for(const [key, value] of Object.entries(data.tickers)){
            //create the json we want to send back
            coinGeckoReturnData[`${value.market.name}`] = {}

            coinGeckoReturnData[`${value.market.name}`].btc = value.converted_last.btc
            coinGeckoReturnData[`${value.market.name}`].eth = value.converted_last.eth
            coinGeckoReturnData[`${value.market.name}`].usd = value.converted_last.usd
        }
        let dataFromDisk = await getMarketDataSource(marketData,"coinGecko")
        // Check if coinGecko is in the db
        if(dataFromDisk === undefined){
            // If coingecko is not in the db create it
            const coinGeckoData = new dataSource("coinGecko",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
            // Check if dataSource already exists

            updateOrCreateDataSource(coinGeckoData)

            // marketData.push(coinGeckoData)
            // saveDataSource(marketData)
        }else{
            // Update coingecko
            updateDataSource(marketData, dataFromDisk, coinGeckoReturnData, Math.floor(new Date().getTime() / 1000))
        }
        // For the old endpoint will be removed soon
        return data.tickers
    }else{
        console.log("coingecko Error")
        console.log(data)
    }
}

/**
 * Gets information from coin gecko directly.
 * Market data that is created by coingecko unlike the other call which just passes through marketdata from other markets
 * @param {string} baseCurrency 
 * @returns 
 */
async function getDataCoinGeckoDirect(marketData, baseCurrency){
    // Format input data and output in a known format for the rest of the program
    // Check what the base currency is
    let url = 'https://api.coingecko.com/api/v3/coins/'+ticker+'?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
    let data = await getData(url)
    if(data == "error:Ag"){
        console.log("error Ag: " + Math.floor(new Date().getTime() / 1000))
        // This will spam calls to coingecko which they count against us its better to just keep the data and try to refresh again on the next interval
        let dataFromDisk = await getMarketDataSource(marketData, "coinGeckoDirect")
        console.log(dataFromDisk)
        updateDataSource(marketData, dataFromDisk, dataFromDisk.data, Math.floor(new Date().getTime() / 1000))
        return dataFromDisk.data
    }else{
        if(data.market_data){
            if(data.market_data.current_price){
                let coinGeckoReturnData = {}
                coinGeckoReturnData['coinGecko'] = {}
                for(const [key, value] of Object.entries(data.market_data.current_price)){
                    coinGeckoReturnData.coinGecko[`${key}`] = value
                }
                let dataFromDisk = await getMarketDataSource(marketData, "coinGeckoDirect")
                // Check if coinGecko is in the db
                if(dataFromDisk === undefined){
                    //if coingecko is not in the db create it
                    const coinGeckoData = new dataSource("coinGeckoDirect",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
                    // Check if dataSource already exists

                    updateOrCreateDataSource(coinGeckoData)

                    // marketData.push(coinGeckoData)
                    // saveDataSource(marketData)
                }else{
                    // Update coingecko
                    updateDataSource(marketData, dataFromDisk, coinGeckoReturnData, Math.floor(new Date().getTime() / 1000))
                }
                // For the old endpoint will be removed soon
                return data.market_data.current_price
            }else{
                console.log("coinGeckoDirect error no current price data returned")
            }
        }else{
            console.log("coinGeckoDirect error no data returned")
            console.log(data)
        }
    }
}

//Auto check the data
async function autoCheckData(){
    // Fetch market data from disk
    let arrMarketData = await readDataSource();
    if (arrMarketData.length == 0) {
        console.warn("Price API called without any data in DB, fetching from all sources...");
        await getMarketData(arrMarketData, 'coinGecko','usd');
        await getMarketData(arrMarketData, 'coinGeckoDirect', 'usd')
        await getMarketData(arrMarketData, 'binance','usd');
        await getMarketData(arrMarketData, 'coinMarketCap','usd');
        arrMarketData = await readDataSource();
    }
    // Aggregate the prices from our various sources
    arrMarketData.forEach((cMarketDataLastChecked) => {
        if (cMarketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - cMarketDataLastChecked.updateSnapshotTime) {
            // Start a data refresh if this looks outdated
            console.log("Updated database: " + cMarketDataLastChecked.dataSourceName);
            getMarketData(arrMarketData, cMarketDataLastChecked.dataSourceName, 'usd');
        }
    });
}

//Check even if no visitors 
setInterval(() => {autoCheckData();}, autoUpdateInterval * 1000);


module.exports = {
    getMarketData,
}