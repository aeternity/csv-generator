# Aeternity Token Database

To setup the database and calculate the token distribution,, follow the described steps:

## 1. Setup Postgres

To make sure you have a database that is able to handle large numbers correctly, setup postgres locally. Generate all tables after setting up postgres using `npm run clean`. 

## 2. Configure Environment

You will need to supply an Etherscan.io API Key to run the project. Either using an environment-variable named `ETHERSCAN_API_TOKEN` or by creating a `.env` file. You can use the supplied `.env.default` as a template. The file also allows you to configure your postgres parameters for your system.

## 3. Sync Data

Then simply use `npm run sync`. This will automatically fetch all necessary poloniex currency data and ETH/BTC transactions. 

## 4. Export CSV-Data

Use `npm run csv` to generate a `contributors.csv` with all necessary data.

# FAQ

### Currency Rates

* `npm run currency-btc-eth` - Fetches the rates from Poloniex for BTC-ETH conversion
* `npm run currency-usd-eth` - Fetches the rates from Poloniex for USD-ETH conversion
* `npm run currency-usd-btc` - Fetches the rates from Poloniex for USD-BTC conversion

### Transactions

All transactions are fetched from etherscan.io and blockchain.info. Please check the included `src/config.js` to see which addresses are pulled.

* `npm run transactions-eth` - Fetches all transactions made to the specified ETH adresses in the `src/config.js` file.

* `npm run transactions-btc` - Fetches all transactions made to the specified BTC adresses in the `src/config.js` file.

### Query the Database

If the `npm run sync` task successfully succeeds, you now have a SQL-Database you can query to export all necessary information about the Aeternity Contribution Campaign.

For example, to find out how many tokens each ether-contribution-address gets, you could use a query like:

```
SELECT transactions_eths."from", sum((transactions_eths.value/ 1000000000000000000.0) * rates."avgRate") as tokens, sum(transactions_eths.value / 1000000000000000000.0) as ether
    FROM rates, transactions_eths WHERE 
        rates."currency" = 'ETH_AETERNITY'
	AND extract(epoch from rates."startTime") <= transactions_eths."timeStamp"
        AND extract(epoch from rates."endTime") > transactions_eths."timeStamp"
        GROUP BY transactions_eths."from"
```