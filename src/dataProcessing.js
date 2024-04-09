/**
 * Filters the outliers from an array to give you a "cleaner" array without huge outliers
 * These outliers can come about due to bad api's or broken exchanges
 * @param {array} marketData 
 * @returns 
 */
function filterOutliers(marketData) {
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
    const Q1 = quartile(marketData, .40);
    const Q3 = quartile(marketData, .70);
    const IQR = Q3 - Q1;
    let noneOutliers=[]
    marketData.forEach(number => {
        if(number > (Q3 + (1.5 * IQR)) || number < (Q1 - (1.5 * IQR))) {
        } else {
            noneOutliers.push(number);
        }
    });
    return noneOutliers
}

module.exports = {
    filterOutliers,
}