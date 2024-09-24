/**
 * Represents price data.
 */
class dataSource {
    /**
     * Holds data from the data sources
     * @param {*} dataSourceName //The name or id of the source of the data
     * @param {*} data           //Object of objects of the current prices that we can get from this source
     * @param {*} lastUpdated    //The last time this data was updated
     */
    constructor(dataSourceName, data, lastUpdated){
        //The name of the dataSource
        this.dataSourceName = dataSourceName

        //Object of current price data that the data source provides in name:price format
        //the 'market place' name is required due to allowing aggregators like coingecko and coinmarketcap
        // stakecube:
        //     {
        //         btc:0.0000630
        //         eth:0.01
        //         usd:0.45
        //     }
        // 
        this.data = data

        this.enabled

        //We use UNIX time not the javascript native (seconds in unix vs milliseconds as js native)
        this.lastUpdated = lastUpdated

    }
    /** Return an Order class from a raw JSON of an Order */
    static from(jsonOrder) {
        const marketData = new dataSource();

        // Insert the correct data by matching keys of the Order class
        for (const strKey of Object.keys(marketData)) {
            if (jsonOrder[strKey] !== undefined)
                marketData[strKey] = jsonOrder[strKey];
        }
        // Return the Order
        return marketData;
    }

    /** Convert the order in to a Database JSON object */
    toJSON() {
        /** @type {dataSource} A semi-deep-cloned order intended for JSON safe storage */
        const cJSONdataSource = { ...this };

        // Return the JSON Order
        return cJSONdataSource;
    }
}
class historicalDataSource {
        /**
     * Holds data from the historical data sources
     * @param {*} 
     * @param {*} 
     * @param {*} 
     */
        constructor(ticker, tickerPrice, timeUpdated){
            this.ticker = ticker
    
            this.tickerPrice = tickerPrice

            this.timeUpdated = timeUpdated
    
        }
        /** Return an Order class from a raw JSON of an Order */
        static from(jsonOrder) {
            const marketData = new historicalDataSource();
    
            // Insert the correct data by matching keys of the Order class
            for (const strKey of Object.keys(marketData)) {
                if (jsonOrder[strKey] !== undefined)
                    marketData[strKey] = jsonOrder[strKey];
            }
            // Return the Order
            return marketData;
        }
    
        /** Convert the order in to a Database JSON object */
        toJSON() {
            /** @type {historicalDataSource} A semi-deep-cloned order intended for JSON safe storage */
            const cJSONdataSource = { ...this };
    
            // Return the JSON Order
            return cJSONdataSource;
        }
}

module.exports = {
    dataSource,
    historicalDataSource
}