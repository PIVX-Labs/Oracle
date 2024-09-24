const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DataSourceData = new Schema({
    dataSourceName: String,
    data: Schema.Types.Mixed,
    enabled: {
        type: Schema.Types.Boolean,
        default: true,
    },
    lastUpdated: Number,
});

module.exports = mongoose.model("DataSources", DataSourceData);