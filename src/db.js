//simple JSON "database"
const fs = require('fs');
const { dataSource, historicalDataSource } = require('./dataSource');

const DataSourceDataSchema = require('../models/DataSourceData');
const DataSourceHistoricalData = require('../models/DataSourceHistoricalData');

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

/**
 * Read a list of prices
 */
async function readDataSource() {

    const priceDiskData = await DataSourceDataSchema.find({})

    // Convert to Order classes with correct typing
    const priceData = [];
    for (const pDiskData of priceDiskData) {
        // Parse the Order from JSON
        const priceDiskDataOut = dataSource.from(pDiskData);

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
        // MONGODB UPDATE
        const savePricePoint = {
            ticker: dataSource.ticker,
            tickerPrice: dataSource.tickerPrice,
            timeUpdated: dataSource.timeUpdated,
        }
        let createHistoricalDataPoint = await DataSourceHistoricalData.create( savePricePoint );
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
        const priceDiskDataOut = historicalDataSource.from(pDiskData);

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
    readHistoricalDataSource
}