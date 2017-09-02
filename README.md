# Aeternity Token Database

To setup the database and create the CSV with the initial token distribution on the Ethereum network, follow the described steps:

## 1. Configure Environment

You will need to supply an Etherscan.io API Key to run the project. Either using an environment-variable named `ETHERSCAN_API_TOKEN` or by creating a `.env` file. You can use the supplied `.env.default` as a template. The file also allows you to configure your postgres parameters for your system.


## 2. Setup Docker
* Install docker and docker-compose
* Run `docker-compose build --no-cache`
* Run `docker-compose up -d pgsql`
* Run `docker-compose run --rm csv-generator bash`


Generate all tables after setting up postgres using `npm run clean`.

Use `docker-compose down` and re-run these steps after every code change

### Some more Docker commands:
* Remove docker containers with `docker-compose down`
* List Running containers and ID's with `docker ps`
* Copy files from the Container to Host with , `docker cp CONTAINERID:PATH HOSTPATH`, for example contributions.csv `docker cp CONTAINERID:/usr/src/app/contributions.csv ./`

## 3. Sync Data

Then simply use `npm run sync`. This will automatically fetch all necessary poloniex currency data and ETH/BTC transactions.

## 4. Export CSV-Data

Use `npm run csv` to generate a `contributors.csv` with all necessary data.

## 5. Export Test CSV-Data

Use `npm run test-csv` to generate a `test_contributors.csv` with all necessary data.

This file is for a test deploy of a fake token only. DO NOT SEND ANYTHING OF VALUE to these addresses.

Addresses were generated with a BIP39 Mnemonic (https://iancoleman.github.io/bip39/

BIP39 Mnemonic: "sand rough seminar response furnace multiply ship glide hire nation strategy conduct"

BIP32 Derivation Path: "m/44'/60'/0'/0"

## 6. Append manually created csv

Run `npm run append-csv` to append a manually created `manual-contributions.csv` to the previously created `contributions.csv`.

`manual-contributions.csv` must be the same csv format as `contributions.csv` **without** a header.

This will print hashes of the files pre and post appending.


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
