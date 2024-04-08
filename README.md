<h2 align="center">
  A price oracle that can give you accurate average price data from multiple sources
</h2>

EndPoints:

`/currencies`
  - returns all the collected data we have for other tickers against pivx

`/price/{ticker}`
  - returns the collected market data we have for the selected {ticker}

Generally returns in this format
```
[
  {
  "currency": "USD",
  "value": 0.55,
  "last_updated": 0 // just the timestamp this data was last updated successfully
  },
 ...
]
```