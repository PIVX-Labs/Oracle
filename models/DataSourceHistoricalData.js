// "ticker": "btc",
// "tickerPrice": 0.00000367,
// "timeUpdated": 1721691044

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DataSourceHistoricalData = new Schema({
    ticker: String,
    tickerPrice: Schema.Types.Decimal128,
    timeUpdated: Number,
});

//Convert Decimal128
const decimal2JSON = (v, i, prev) => {
    if (v !== null && typeof v === 'object') {
      if (v.constructor.name === 'Decimal128')
        prev[i] = v.toString();
      else
        Object.entries(v).forEach(([key, value]) => decimal2JSON(value, key, prev ? prev[i] : v));
    }
  };
  
  DataSourceHistoricalData.set('toJSON', {
    transform: (doc, ret) => {
      decimal2JSON(ret);
      return ret;
    }
  });

module.exports = mongoose.model("HistoricalData", DataSourceHistoricalData);