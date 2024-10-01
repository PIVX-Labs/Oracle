const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DataSourceData = new Schema({
    dataSourceName: String,
    data: Schema.Types.Mixed,
    enabled: {
        type: Schema.Types.Boolean,
        default: true,
    },
    updateSnapshotTime: {
        type:Number,
        default: 60,
    },
    lastUpdated: Number,
});

module.exports = mongoose.model("DataSources", DataSourceData);