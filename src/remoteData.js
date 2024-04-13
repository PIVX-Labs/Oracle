const https = require('https');
const { dataSource } = require('./dataSource');
const { readDataSource, saveDataSource } = require('./db');

let coinMarketCapApiKey = process.env.CMC_KEY;
let ticker = process.env.TICKER || 'pivx';


/**
 * Checks the time from the last checks of our data sources updates them if need be, and returns the data the users need
 * @param {string} baseCurrency //The currency ticker that we want against pivx if none passed we will return everything we have
 */
async function getMarketData(marketData, dataSource, baseCurrency){
    //Get the last update from each of the data sources
    if (dataSource == 'coinGecko'){
        let coinGeckoData = await getDataCoinGecko(marketData, baseCurrency)
        //average the price in coingecko
        if(coinGeckoData){
        }else{
            console.log("issue with coinGeckoData: ")
        }
    }

    if (dataSource == 'coinGeckoDirect'){
        let coinGeckoDirectData = await getDataCoinGeckoDirect(marketData, baseCurrency)
        //average the price in coingecko
        if(coinGeckoDirectData){
        }else{
            console.log("issue with coinGeckoDirectData: ")
        }
    }

    if (dataSource == 'binance'){
        let binanceData = await getDataBinance(marketData, baseCurrency)
        if(binanceData.msg == "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.binance.com/en/terms. Please contact customer service if you believe you received this message in error."){
            console.log("bad region, binance won't give data")
        }else{
        }
    }
    if (dataSource == 'coinMarketCap'){
        let CoinMarketCapData =await getDataCoinMarketCap(marketData, baseCurrency)
        if(CoinMarketCapData.data){
        }else{
            console.log("Coin Market Cap not working")
        }
    }
}

/**
 * Allows you to get all the marketData from a data Source
 * @param {string} dataSourceNamePassed //The name of the data source
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

/**
 * Gets the coin market cap data
 * @returns 
 */
async function getDataCoinMarketCap(marketData,baseCurrency){
    //format input data and output in a known format for the rest of the program
    let url = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?CMC_PRO_API_KEY="+coinMarketCapApiKey+"&slug="+ ticker
    return await getData(url)
}

/**
 * grabs price ticker data from binance
 * @param {string} baseCurrency 
 * @returns 
 */
async function getDataBinance(marketData, baseCurrency){
    //format input data and output in a known format for the rest of the program
    //use USDT as Binance doesn't do just straight usd
    if (baseCurrency == 'usd'){baseCurrency = 'usdt'}
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol='+ ticker.toUpperCase() + baseCurrency.toUpperCase()
   
    let data = await getData(url)

    let dataFromDisk = await getMarketDataSource(marketData,"binance")
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
            let binanceReturnData = await getMarketDataSource(marketData, 'binance')
            binanceReturnData.data.binance[`${baseCurrency}`] = data.price
            //update binance
            updateDataSource(marketData, dataFromDisk, binanceReturnData.data, Math.floor(new Date().getTime() / 1000))
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
        let dataFromDisk = await getMarketDataSource(marketData,"coinGecko")
        //Check if coinGecko is in the db
        if(dataFromDisk === undefined){
            //if coingecko is not in the db create it
            const coinGeckoData = new dataSource("coinGecko",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
            //check if dataSource already exists
            marketData.push(coinGeckoData)
            saveDataSource(marketData)
        }else{
            //update coingecko
            updateDataSource(marketData, dataFromDisk, coinGeckoReturnData, Math.floor(new Date().getTime() / 1000))
        }
        //For the old endpoint will be removed soon
        return data.tickers
    }else{
        console.log("coingecko Error")
    }
}

/**
 * Gets information from coin gecko directly.
 * Market data that is created by coingecko unlike the other call which just passes through marketdata from other markets
 * @param {string} baseCurrency 
 * @returns 
 */
async function getDataCoinGeckoDirect(marketData, baseCurrency){
    //format input data and output in a known format for the rest of the program
    //Check what the base currency is
    let url = 'https://api.coingecko.com/api/v3/coins/'+ticker+'?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false'
    let data = await getData(url)
    if(data.market_data){
        if(data.market_data.current_price){
            let coinGeckoReturnData = {}
            coinGeckoReturnData['coinGecko'] = {}
            for(const [key, value] of Object.entries(data.market_data.current_price)){
                coinGeckoReturnData.coinGecko[`${key}`] = value
            }
            let dataFromDisk = await getMarketDataSource(marketData, "coinGeckoDirect")
            //Check if coinGecko is in the db
            if(dataFromDisk === undefined){
                //if coingecko is not in the db create it
                const coinGeckoData = new dataSource("coinGeckoDirect",coinGeckoReturnData,Math.floor(new Date().getTime() / 1000))
                //check if dataSource already exists
                marketData.push(coinGeckoData)
                saveDataSource(marketData)
            }else{
                //update coingecko
                updateDataSource(marketData, dataFromDisk, coinGeckoReturnData, Math.floor(new Date().getTime() / 1000))
            }
            //For the old endpoint will be removed soon
            return data.tickers
        }else{
            console.log("coingecko Error")
        }
    }else{
        console.log("Issue with coingecko direct: ")
        console.log(data)
    }
}

module.exports = {
    getMarketData,
}