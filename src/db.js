//simple JSON "database"
const fs = require('fs');
const { dataSource } = require('./dataSource');

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
    }

    // Save list to disk (generate directory if necessary)
    if (!fs.existsSync('database/')) fs.mkdirSync('database');
    fs.writeFileSync('database/prices.json', JSON.stringify(priceDiskData, null, 2));
}

/**
 * Read a list of prices
 */
async function readDataSource() {
    // Ensure the file exists
    if (!fs.existsSync('database/') || !fs.existsSync('database/prices.json')) return [];

    // Parse the list from disk
    const priceDiskData = JSON.parse(fs.readFileSync('database/prices.json', { encoding: 'utf8' }));

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
        // Convert to JSON
        const cDataSource = dataSource.toJSON();
        priceDiskData.push(cDataSource);
    }

    // Save list to disk (generate directory if necessary)
    if (!fs.existsSync('database/')) fs.mkdirSync('database');
    fs.writeFileSync('database/historical.json', JSON.stringify(priceDiskData, null, 2));
}

/**
 * Read a list of historical prices
 */
async function readHistoricalDataSource() {
    // Ensure the file exists
    if (!fs.existsSync('database/') || !fs.existsSync('database/historical.json')) return [];

    // Parse the list from disk
    const priceDiskData = JSON.parse(fs.readFileSync('database/historical.json', { encoding: 'utf8' }));

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


module.exports = {
    saveDataSource,
    readDataSource,
    saveHistoricalData,
    readHistoricalDataSource
}