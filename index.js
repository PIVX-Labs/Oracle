const express = require('express')
const https = require('https');
const app = express()
const { dataSource } = require('./src/dataSource');
const { readDataSource, saveDataSource } = require('./src/db');
const port = 3000

let marketData = []

let price 
let lastTimeCheckedUsd = lastTimeChecked = 0
let coinMarketCapApiKey = ""
let ticker = 'pivx'

//These are the two caches
let nonUsdCache = {}
let priceArray = new Array();

async function getOrder(dataSourceNamePassed){
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
    console.log(url)
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
    if (baseCurrency == 'usd'){baseCurrency = 'USDT'}
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol='+ ticker.toUpperCase() + baseCurrency.toUpperCase()
    return await getData(url)
}

async function getDataCoinGecko(baseCurrency){
    //format input data and output in a known format for the rest of the program

    //Check what the base currency is
    if(baseCurrency == 'usd'){
        let url = 'https://api.coingecko.com/api/v3/coins/'+ticker+'/tickers'
        let data = await getData(url)
        if(data.tickers){

            let coinGeckoReturnData = {}
            let updateTime = Math.floor(new Date().getTime() / 1000)
            for(const [key, value] of Object.entries(data.tickers)){
                //console.log(value.market)
                //create the json we want to send back
                coinGeckoReturnData[`${value.market.name}`] = {}

                coinGeckoReturnData[`${value.market.name}`].btc = value.converted_last.btc
                coinGeckoReturnData[`${value.market.name}`].eth = value.converted_last.eth
                coinGeckoReturnData[`${value.market.name}`].usd = value.converted_last.usd
            }
            // //console.log(coinGeckoReturnData)
            //const coinGeckoData = new dataSource("coinGecko",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
            // //check if dataSource already exists
            // marketData.push(coinGeckoData)
            //saveDataSource(marketData)

            //Get the dataSource
            let dataFromDisk = getOrder("coinGecko")
            console.log(dataFromDisk)
            updateDataSource(dataFromDisk, coinGeckoReturnData, updateTime)

            //saveOrders("coinGecko",data.tickers,Math.floor(new Date().getTime() / 1000))
            return data.tickers

        }else{
            console.log("coingecko Error")
        }
    }else{

    }
}

async function filterOutliers(marketData) {
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
async function getMarketData(baseCurrency){
    //Get the last update from each of the data sources

}

app.get('/currencies', async(req, res) =>{
    //(list of possible currencies alongside the number)

    //Check for required updates and async call
    // for (marketDataLastChecked in marketData){
    //     console.log(marketDataLastChecked)
    // }
    marketData.forEach((marketDataLastChecked) => {
        console.log(marketDataLastChecked.lastUpdated)
        //If the lastupdated time is to out of date run an async to update it
    })
    //pull from the market data and avg all the prices from the exchanges together throwing out the outliers 


    //return in the following format:
    // [
    //     {
    //       "currency": "USD",
    //       "value": 0.55,
    //       "last_updated": 0 // just the timestamp this data was last updated successfully
    //     },
    //     // ...
    //   ]
    res.send("hia")
});

app.get('/price/$currency', async(req,res) =>{
    //return a single currency


    //return in the following format:
    // [
    //     {
    //       "currency": "USD",
    //       "value": 0.55,
    //       "last_updated": 0 // just the timestamp this data was last updated successfully
    //     },
    //     // ...
    //   ]
});

//Legacy and will be getting migrated to the other routes
app.get('/', async (req, res) => {
    //returns an avg of usd
    const average = array => array.reduce((a, b) => a + b) / array.length;
    let baseCurrency = 'usd'
    if(req.query.convertCurrency){baseCurrency = req.query.convertCurrency}
    //Compiling the date against USD
    if(baseCurrency == 'usd'){
        if(lastTimeCheckedUsd < Date.now() - 30000){
            lastTimeCheckedUsd = Date.now()
            let coinGeckoData = await getDataCoinGecko(baseCurrency)
            let binanceData = await getDataBinance(baseCurrency)
            let CoinMarketCapData =await getCoinMarketCapData(baseCurrency)
            if(binanceData.msg == "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms. Please contact customer service if you believe you received this message in error."){
                console.log("bad region, binance won't give data")
            }else{
                priceArray.push(binanceData.price)
            }
            if(CoinMarketCapData.data){
                priceArray.push(CoinMarketCapData.data.pivx.quote.USD.price)
            }else{
                console.log("Coin Market Cap not working")
            }
            //average the price in coingecko
            if(coinGeckoData){
                if(coinGeckoData[0]){
                    for (const [key, value] of Object.entries(coinGeckoData)) {
                        priceArray.push(parseFloat(value.last))
                    }
                }
            }
            //Avg all the price data together to get an avg price in the base currency
            //filter the outliers
            priceArray = await filterOutliers(priceArray)
            //get the avg of the priceArray
            console.log("updatedPriceUSD")
        }   
        price = average(priceArray)
    }else{
        //Compiling that data against a different baseCurrency other then USD
        if(lastTimeChecked < Date.now() - 30000){
            lastTimeChecked = Date.now()
            nonUsdCache.baseCurrency = []
            let binanceData = await getDataBinance(baseCurrency)
            if(binanceData.msg == "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms. Please contact customer service if you believe you received this message in error."){
                console.log("bad region, binance won't give data")
            }else{
                nonUsdCache.baseCurrency.push(binanceData.price)
            }
            console.log("updatedPriceWeird")
        }
        price = average(nonUsdCache.baseCurrency)
    }

    //change to respond in the format below
    res.json(price)
    // [
    //     {
    //       "currency": "USD",
    //       "value": 0.55,
    //       "last_updated": 0 // just the timestamp this data was last updated successfully
    //     },
    //     // ...
    //   ]
})

onStart()

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})