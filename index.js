const express = require('express')
const https = require('https');
const app = express()
const port = 3000

let price 
let lastTimeCheckedUsd = lastTimeChecked = 0
let coinMarketCapApiKey = ""
let ticker = 'pivx'

//These are the two caches
let nonUsdCache = {}
let priceArray = new Array();

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
                //console.log(data);
                try {
                    let json = JSON.parse(data);
                    // do something with JSON
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
    let url = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?CMC_PRO_API_KEY="+coinMarketCapApiKey+"&slug="+ ticker
    return await getData(url)

}

async function getDataBinance(baseCurrency){
    if (baseCurrency == 'usd'){baseCurrency = 'USDT'}
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol='+ ticker.toUpperCase() + baseCurrency.toUpperCase()
    //console.log(url)
    //console.log(await getData(url))
    return await getData(url)
}

async function getDataCoinGecko(baseCurrency){
    if(baseCurrency == 'usd'){
        //https://api.coingecko.com/api/v3/coins/pivx/tickers
        let url = 'https://api.coingecko.com/api/v3/coins/'+ticker+'/tickers'
        let data = await getData(url)
        console.log(data)
        if(data.tickers){
            return data.tickers
        }else{
            console.log("coingecko Error")
        }
    }else{

    }
}

async function filterOutliers(priceData) {
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
    const Q1 = quartile(priceData, .40);
    const Q3 = quartile(priceData, .70);
    const IQR = Q3 - Q1;
    let noneOutliers=[]
    priceData.forEach(number => {
        if(number > (Q3 + (1.5 * IQR)) || number < (Q1 - (1.5 * IQR))) {
            //console.log('number is outlier: ' + number);
        }
        else {
            noneOutliers.push(number);
        }
    });
    return noneOutliers
}



app.get('/', async (req, res) => {
    const average = array => array.reduce((a, b) => a + b) / array.length;
    let baseCurrency = 'usd'
    if(req.query.convertCurrency){baseCurrency = req.query.convertCurrency}



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
    res.json(price)

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})