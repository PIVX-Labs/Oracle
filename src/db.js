//simple JSON "database"
const fs = require('fs');

const DataSourceDataSchema = require('../models/DataSourceData');
const DataSourceHistoricalData = require('../models/DataSourceHistoricalData');

/**
 * This function is used to jumpstart if a person has no data in mongodb
 */
async function jumpStart(){
    const dataSourceExists = await DataSourceDataSchema.find({}).lean()

    if(dataSourceExists === undefined || dataSourceExists.length == 0){
        DataSourceDataSchema.create({
            dataSourceName: 'coinGecko',
            data: [],
            enabled: true,
            updateSnapshotTime:63,
            lastUpdated: 0,
        })
        DataSourceDataSchema.create({
            dataSourceName: 'coinGeckoDirect',
            data: [],
            enabled: true,
            updateSnapshotTime:70,
            lastUpdated: 0,
        })
        DataSourceDataSchema.create({
            dataSourceName: 'binance',
            data: [],
            enabled: true,
            binance:10,
            lastUpdated: 0,
        })
        DataSourceDataSchema.create({
            dataSourceName: 'coinMarketCap',
            data: [],
            enabled: true,
            coinMarketCap: 10,
            lastUpdated: 0,
        })
    }
}

jumpStart()

/**
 * Save or update current prices
 * @param {Array<dataSource>} priceData 
 */
async function saveDataSource(priceData) {
    if (!priceData || !priceData.length) return;

    for (const dataSource of priceData) {

        // MONGODB UPDATE
        const filter = { dataSourceName: dataSource.dataSourceName};
        const update = {
            dataSourceName: dataSource.dataSourceName,
            data: dataSource.data,
            lastUpdated: dataSource.lastUpdated,
        }
        let updateAmountOrdered = await DataSourceDataSchema.findOneAndUpdate(filter, update, {
            new: true
        });
    }
}

async function updateOrCreateDataSource(marketData){
    // MONGODB UPDATE
    const filter = { dataSourceName: marketData.dataSourceName};
    const update = {
        data: marketData.data,
        lastUpdated: marketData.lastUpdated,
    }
    let updateAmountOrdered = await DataSourceDataSchema.findOneAndUpdate(filter, update, {
        new: true
    });
}

/**
 * Read a list of prices
 */
async function readDataSource() {
    const priceDiskData = await DataSourceDataSchema.find({})
    // Return the orders
    return priceDiskData;
}

/**
 * Saves historical data
 * @param {Array<dataSource>} priceData 
 * @returns 
 */
async function saveHistoricalData(priceData){
    if (!priceData || !priceData.length) return;

    for (const dataSource of priceData) {
        let query = {ticker: dataSource.ticker, timeUpdated: dataSource.timeUpdated}
        // MONGODB UPDATE
        const savePricePoint = {
            ticker: dataSource.ticker,
            tickerPrice: dataSource.tickerPrice,
            timeUpdated: dataSource.timeUpdated,
        }
        let createHistoricalDataPoint = await DataSourceHistoricalData.findOneAndUpdate( query, savePricePoint,{upsert:true,setDefaultsOnInsert: true} );
    }
}

/**
 * Read a list of historical prices
 */
async function readHistoricalDataSource(strCurrency) {
    //For now we will not respond with data over 31 days ago
    const today = new Date();
    const priorDate = Math.floor(new Date(new Date().setDate(today.getDate() - 31)).valueOf() /1000);
    const priceDiskData = await DataSourceHistoricalData.find(
        {
            timeUpdated:{$gt:priorDate},
            ticker:{$in:strCurrency}
        })
    // Return the orders
    return priceDiskData;
}

async function getNewestTimeStampHistoricalData(){
    const newestHistoricalTimeStamp = await DataSourceHistoricalData.findOne({}).sort({timeUpdated: -1})
    if(newestHistoricalTimeStamp){
        return newestHistoricalTimeStamp.timeUpdated;
    }else{
        return 0;
    }
}

module.exports = {
    saveDataSource,
    readDataSource,
    saveHistoricalData,
    readHistoricalDataSource,
    getNewestTimeStampHistoricalData,
    updateOrCreateDataSource,
}