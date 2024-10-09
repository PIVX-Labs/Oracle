//simple JSON "database"
const fs = require('fs');
const { dataSource, historicalDataSource } = require('./dataSource');

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

    // Convert orders to a disk-safe format
    const priceDiskData = [];

    for (const dataSource of priceData) {
        // Convert to JSON
        const cDataSource = dataSource.toJSON();
        priceDiskData.push(cDataSource);

        // MONGODB UPDATE
        const filter = { dataSourceName: dataSource.dataSourceName};
        const update = {
            dataSourceName: cDataSource.dataSourceName,
            data: cDataSource.data,
            lastUpdated: cDataSource.lastUpdated,
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

    // Convert to Order classes with correct typing
    const priceData = [];
    for (const pDiskData of priceDiskData) {
        // Parse the Order from JSON
        const priceDiskDataOut = pDiskData;

        // Push to the Class List
        priceData.push(priceDiskDataOut);
    }

    // Return the orders
    return priceData;
}

/**
 * Saves historical data
 * @param {Array<dataSource>} priceData 
 * @returns 
 */
async function saveHistoricalData(priceData){
    if (!priceData || !priceData.length) return;

    // Convert orders to a disk-safe format
    const priceDiskData = [];

    for (const dataSource of priceData) {
        priceDiskData.push(dataSource);
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
async function readHistoricalDataSource() {
    const priceDiskData = await DataSourceHistoricalData.find({})

    // Convert to Order classes with correct typing
    const priceData = [];
    for (const pDiskData of priceDiskData) {
        // Parse the Order from JSON
        const priceDiskDataOut = pDiskData;

        // Push to the Class List
        priceData.push(priceDiskDataOut);
    }

    // Return the orders
    return priceData;
}


module.exports = {
    saveDataSource,
    readDataSource,
    saveHistoricalData,
    readHistoricalDataSource,

    updateOrCreateDataSource,

}