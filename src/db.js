//simple JSON "database"
const fs = require('fs');
const { dataSource } = require('./dataSource');

/**
 * Save prices
 * @param {Array<Order>} priceData 
 */
async function saveDataSource(priceData) {
    if (!priceData || !priceData.length) return;

    // Convert orders to a disk-safe format
    const priceDiskData = [];


    for (const dataSource of priceData) {
        console.log(dataSource)
        // Convert to JSON
        const cDataSource = dataSource.toJSON();
        priceDiskData.push(cDataSource);
    }

    // Save list to disk (generate directory if necessary)
    if (!fs.existsSync('database/')) fs.mkdirSync('database');
    fs.writeFileSync('database/prices.json', JSON.stringify(priceDiskData, null, 2));

    console.log('Database: Saved the state of ' + priceDiskData.length + ' to disk');
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

    console.log('DB: Parsed ' + priceDiskData.length + ' data source(s) from disk');

    // Return the orders
    return priceData;
}

module.exports = {
    saveDataSource,
    readDataSource
}