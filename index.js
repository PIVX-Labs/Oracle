const express = require('express')
const https = require('https');
const app = express()
const { dataSource } = require('./src/dataSource');
const { readDataSource, saveDataSource } = require('./src/db');
const port = 3000
const dataSourceUpdateTime = { //listed in seconds
    coinGecko: 30,
    coinMarketCap: 10,
    binance: 10,
}

let marketData = []
let coinMarketCapApiKey = ""
let ticker = 'pivx'

async function getMarketDataSource(dataSourceNamePassed){
    return marketData.find(dataSource => dataSource.dataSourceName === dataSourceNamePassed);
}

async function updateDataSource(dataSource,data,updateTime){
    dataSource.data = data;
    dataSource.lastUpdated = updateTime;
    await saveDataSource(marketData);
}

async function onStart(){
    //load price data from the db
    const arrPersistantDataSource = await readDataSource();
    for (const dataSource of arrPersistantDataSource) {
        marketData.push(dataSource);
    }
}

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
                    //do something with the JSON
                    resolve(json)
                } catch (error) {
                    console.error(error.message);
                    resolve(data)
                };
                
            });
            
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
    })
}

async function getCoinMarketCapData(){
    //format input data and output in a known format for the rest of the program

    let url = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?CMC_PRO_API_KEY="+coinMarketCapApiKey+"&slug="+ ticker
    return await getData(url)

}

async function getDataBinance(baseCurrency){
    //format input data and output in a known format for the rest of the program
    //use USDT as Binance doesn't do just straight usd
    if (baseCurrency == 'usd'){baseCurrency = 'usdt'}
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol='+ ticker.toUpperCase() + baseCurrency.toUpperCase()
   
    let data = await getData(url)

    let dataFromDisk = await getMarketDataSource("binance")
    //check if binance returned what we think it should
    if(data.price){

        //Check if binance is in the db
        if(dataFromDisk === undefined){
            let binanceReturnData = {
                'binance':{}
            }
            //if binance is not in the db create it
            const binanceData = new dataSource("binance",binanceReturnData,Math.floor(new Date().getTime() / 1000))
            //check if dataSource already exists
            marketData.push(binanceData)
            saveDataSource(marketData)
        }else{
            let binanceReturnData = await getMarketDataSource('binance')
            binanceReturnData.data.binance[`${baseCurrency}`] = data.price
            //update binance
            updateDataSource(dataFromDisk, binanceReturnData.data, Math.floor(new Date().getTime() / 1000))
        }
    //something went wrong with binance
    }else{
        //Check if binance exists in the local db
        //if it does we have nothing to update it with because something went wrong
        //but if not let's make sure it has a template so that it will try again in the future
        if(dataFromDisk === undefined){
            let binanceReturnData = {
                'binance':{}
            }
            //if binance is not in the db create it
            const binanceData = new dataSource("binance",binanceReturnData,Math.floor(new Date().getTime() / 1000))
            //check if dataSource already exists
            marketData.push(binanceData)
            saveDataSource(marketData)
        }else{
            //something went wrong with the binance call but we should still update the time it was last checked to stop spam api calls
            let binanceReturnData = await getMarketDataSource('binance')
            updateDataSource(dataFromDisk, binanceReturnData.data, Math.floor(new Date().getTime() / 1000))
        }
    }
    return await getData(url)
}

async function getDataCoinGecko(baseCurrency){
    //format input data and output in a known format for the rest of the program
    //Check what the base currency is
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
        let dataFromDisk = await getMarketDataSource("coinGecko")
        //Check if coinGecko is in the db
        if(dataFromDisk === undefined){
            //if coingecko is not in the db create it
            const coinGeckoData = new dataSource("coinGecko",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
            //check if dataSource already exists
            marketData.push(coinGeckoData)
            saveDataSource(marketData)
        }else{
            //update coingecko
            updateDataSource(dataFromDisk, coinGeckoReturnData, Math.floor(new Date().getTime() / 1000))
        }
        //For the old endpoint will be removed soon
        return data.tickers
    }else{
        console.log("coingecko Error")
    }
}

function filterOutliers(marketData) {
    //We are just going to create quartiles to get rid of the outliers
    const asc = arr => arr.sort((a, b) => a - b);
    const quartile = (arr, q) => {
        const sorted = asc(arr);
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    };
    const Q1 = quartile(marketData, .40);
    const Q3 = quartile(marketData, .70);
    const IQR = Q3 - Q1;
    let noneOutliers=[]
    marketData.forEach(number => {
        if(number > (Q3 + (1.5 * IQR)) || number < (Q1 - (1.5 * IQR))) {
        } else {
            noneOutliers.push(number);
        }
    });
    return noneOutliers
}
/**
 * Checks the time from the last checks of our data sources updates them if need be, and returns the data the users need
 * @param {string} baseCurrency //The currency ticker that we want against pivx if none passed we will return everything we have
 */
async function getMarketData(dataSource, baseCurrency){
    //Get the last update from each of the data sources
    if (dataSource == 'coinGecko'){
        let coinGeckoData = await getDataCoinGecko(baseCurrency)
        //average the price in coingecko
        if(coinGeckoData){
        }else{
            console.log("issue with coinGeckoData: ")
        }
    }
    if (dataSource == 'binance'){
        let binanceData = await getDataBinance(baseCurrency)
        if(binanceData.msg == "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms. Please contact customer service if you believe you received this message in error."){
            console.log("bad region, binance won't give data")
        }else{
        }
    }
    if (dataSource == 'coinMarketCap'){
        let CoinMarketCapData =await getCoinMarketCapData(baseCurrency)
        if(CoinMarketCapData.data){
        }else{
            console.log("Coin Market Cap not working")
        }
    }
}

app.get('/currencies', async(req, res) =>{

    let response = []
    const average = array => array.reduce((a, b) => a + b) / array.length;

    //if marketData isn't set up
    if(marketData.length == 0){
        console.log("ran no db")
        await getMarketData('coinGecko','usd');
        await getMarketData('binance','usd');
        await getMarketData('coinMarketCap','usd');
    }else{
        //(list of possible currencies alongside the number)
        marketData.forEach((marketDataLastChecked) => {
            if(marketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[marketDataLastChecked.dataSourceName]){
                //If the lastupdated time is to out of date run an async to update it
                console.log("Update database")
                getMarketData(marketDataLastChecked.dataSourceName,'usd');
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

app.use(express.static('public'));

app.get('/price/:currency', async(req,res) =>{

    //if marketData isn't set up
    if(marketData.length == 0){
        getMarketData('usd');
    }

    //return a single currency
    let response = []
    const average = array => array.reduce((a, b) => a + b) / array.length;

    //Look through our db finding anything that matches the currency provided, Take all the values and add them up then return the avg with removed outliers
    marketData.forEach((marketDataLastChecked) => {
        if(marketDataLastChecked.lastUpdated < (new Date().getTime() / 1000) - dataSourceUpdateTime[marketDataLastChecked.dataSourceName]){
            //If the lastupdated time is to out of date run an async to update it
            console.log("Update database")
            getMarketData(marketDataLastChecked.dataSourceName,req.params.currency);
        }
        //average the price
        let aggregate = {}
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
    res.json(response)
});

onStart()

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})