const csvWriter = require('csv-write-stream')
const fs = require('fs')
const sequelize = require('./db').get()
const async = require('async')
const big = require('big.js')
const config = require('./config')
const crypto = require('crypto')

const satoshi = config.BTC.satoshi

const outFile = process.argv[2] || 'contributions-multisig.csv'

// 6h cutoff
const capReached = 1497010079
const capReached6h = capReached + 60 * 60 * 6 // reached at tx 0x140b315651bbf08c2b84fdd970fdfce2c053f4b40fc7260d7f1919fe2b0d1d6a

const spamCutOffUSD = 0.05 // 5 cent cutoff
let spamCounter = 0
let spamValue = big(0)

// sanity checks
let btcPhaseTest = big(0)
let btcPhase1 = big(0)
let btcPhase2 = big(0)
let btcPhase2late = big(0)

let aePhase1 = big(0)
let aePhase2 = big(0)

let aeTotal = big(0)

let csvArray = []
let writer = csvWriter({
  headers: [
    'Address',
    'Tokens',
    'Target',
    'Amount',
    'Currency',
    'Fiat USD',
    'Cumulative USD',
    'Time',
    'TransactionID',
    'Phase',
    'Origin'
  ],
  separator: ','
})

writer.pipe(fs.createWriteStream('./' + outFile))

async.waterfall([

  /**
   * Before Phase 1 - Get all BTC Contributions
   */
  (callback) => {
    sequelize.query(`
            SELECT *,(outputs_btcs.value*23.6941*cast(${config.phases.find(obj => obj.maxBlockTime === 1491311100).factor} as numeric))/100000000.0 AS aeternityTokens --- 23.6941 was the fixed rate, 100000000 is bitcoin to satoshi conversion
            FROM inputs_btcs,outputs_btcs,transactions_btcs,rates WHERE
                outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' --- Phase 2
                OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz') --- Phase 1
                AND rates.currency='ETH_AETERNITY'
                AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time --- join on the rates

                AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time --- join on the rates

                AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
                AND inputs_btcs.converted_eth_address IS NULL  --- removes all invalid addresses
                AND transactions_btcs.time<1491224700   --- before phase 1 starts
        `).spread((results, metadata) => {
          results.forEach(result => {
            csvArray.push([
              result.converted_eth_address, // address
              result.aeternitytokens, // ae tokens
              result.addr, // to
              result.value, // amount (btc)
              'BTC', // currency
              '0', // fiat usd
              '', // cumulative usd
              result.time, // timestamp
              result.hash, // transaction hash
              '0', // phase
              result.converted_btc_address
            ])

            btcPhaseTest = btcPhaseTest.plus(big(result.value))
            aeTotal = aeTotal.plus(big(result.aeternitytokens))
          })

          callback(null)
        })
  },

  /**
   * Phase 1 - Get all BTC Contributions
   */
  (callback) => {
    sequelize.query(`
            SELECT *,(outputs_btcs.value*23.6941*rates."avgRate")/100000000.0 AS aeternityTokens --- 23.6941 was the fixed rate, 100000000 is bitcoin to satoshi conversion
            FROM inputs_btcs,outputs_btcs,transactions_btcs,rates WHERE
                outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' --- Phase 2
                OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz') --- Phase 1
                AND rates.currency='ETH_AETERNITY'
                AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time --- join on the rates

                AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time --- join on the rates

                AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
                AND inputs_btcs.converted_eth_address IS NULL  --- removes all invalid addresses
                AND transactions_btcs.time>1491224700   --- this is just when phase 1 starts
                AND transactions_btcs.time<1496063100  --- this is just before phase 2 starts
        `).spread((results, metadata) => {
          results.forEach(result => {
            csvArray.push([
              result.converted_eth_address, // from
              result.aeternitytokens, // ae tokens
              result.addr, // to
              result.value, // amount (btc)
              'BTC', // currency
              '0', // fiat usd
              '', // cumulative usd
              result.time, // timestamp
              result.hash, // transaction hash
              '1', // phase
              result.prev_out_addr // from
            ])

            btcPhase1 = btcPhase1.plus(big(result.value))
            aeTotal = aeTotal.plus(big(result.aeternitytokens))
            aePhase1 = aePhase1.plus(big(result.aeternitytokens))
          })

          callback(null)
        })
  },

  /**
   * Phase 2 - Get all BTC Contributions
   */
  (callback) => {
    sequelize.query(`
            SELECT *,(btctoeth_helper_suquery.ethereum_conversion / 100000000.0 * rates."avgRate") AS aeternityTokens, --- 100000000 is bitcoin to satoshi conversion
           (SELECT rates."avgRate" FROM rates WHERE rates.currency = 'USDT_BTC'
            AND extract(epoch FROM rates."startTime" AT TIME zone 'utc') > transactions_btcs."time" ORDER BY transactions_btcs."time" ASC LIMIT 1) * (("value" / 100000000.0)) as usdValue
            FROM inputs_btcs,outputs_btcs,transactions_btcs,rates,
                (SELECT transactions_btcs.hash,(outputs_btcs.value/rates."avgRate") AS ethereum_conversion --- 100000000 is bitcoin to satoshi conversion
                FROM inputs_btcs,outputs_btcs,transactions_btcs,rates
                    WHERE
                        outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                        AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                        AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' --- Phase 2
                        OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz') --- Phase 1
                        AND rates.currency='BTC_ETH'
                        AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time
                        AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time
                        AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
                        AND inputs_btcs.converted_eth_address IS NULL  --- removes all invalid addresses
                        AND transactions_btcs.time>1496063100) AS btctoeth_helper_suquery
                WHERE
                    outputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                    AND inputs_btcs.transactions_btc_uuid = transactions_btcs.uuid
                    AND (outputs_btcs.addr='3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc' --- Phase 2
                    OR outputs_btcs.addr='335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz') --- Phase 1
                    AND rates.currency='ETH_AETERNITY'
                    AND btctoeth_helper_suquery.hash=transactions_btcs.hash --- join the table on the time
                    AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_btcs.time --- join on the rates

                    AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_btcs.time --- join on the rates

                    AND inputs_btcs.index=0.0  --- assumption: we only take first input as "contributer"
                    AND inputs_btcs.converted_eth_address IS NULL  --- removes all invalid addresses
                    AND transactions_btcs.time>1496063100  --- this is just before phase 2 starts
        `).spread((results, metadata) => {
          results.forEach(result => {
            if (result.usdvalue >= spamCutOffUSD) {
              let tokens = result.time > capReached6h ? 0 : result.aeternitytokens

              csvArray.push([
                result.converted_eth_address, // from
                tokens, // ae tokens
                result.addr, // to
                result.value, // amount (btc)
                'BTC', // currency
                result.usdvalue, // fiat usd
                '', // cumulative usd
                result.time, // timestamp
                result.hash, // transaction hash
                result.time > capReached6h ? '2-late' : '2', // phase
                result.prev_out_addr
              ])

              if (result.time > capReached6h) {
                btcPhase2late = btcPhase2late.plus(big(result.value))
              } else {
                btcPhase2 = btcPhase2.plus(big(result.value))
              }

              aeTotal = aeTotal.plus(big(tokens))
              aePhase2 = aePhase2.plus(big(tokens))
            } else {
              spamCounter++
              spamValue = spamValue.plus(big(result.usdvalue || 0))
            }
          })

          callback(null)
        })
  }

], (err, result) => {
  if (err) {
    console.warn(err)
  }

  // sort by timestamp
  csvArray.sort((a, b) => {
    // if timestamps are identical, use txHash for ordering
    if (a[7] - b[7] === 0) {
      if (a[8] < b[8]) return -1
      if (a[8] > b[8]) return 1
    }
    return a[7] - b[7]
  })

  // calculate cumulative usd over time
  csvArray.forEach((obj, index) => {
    if (index === 0) {
      obj[6] = big(0)
    } else {
      obj[6] = csvArray[index - 1][6].plus(big(csvArray[index - 1][5]))
    }
  })

  csvArray.forEach(obj => {
    writer.write(obj)
  })

  writer.end()
  sequelize.close()

  const ae100 = aeTotal

  console.log('')
  console.log('')

  console.log('BTC MultiSig Phase 1:', btcPhase1.div(satoshi).toFixed(10), 'BTC')
  console.log('BTC MultiSig Phase 2:', btcPhase2.div(satoshi).toFixed(10), 'BTC')

  console.log('USD Cumulative Phase 2:', csvArray[csvArray.length - 1][6].toFixed(10), 'USD')
  console.log('Filtered Out SpamTx:', spamCounter, ' | Worth:', spamValue.toFixed(10), 'USD')

  console.log(`AE: ${ae100} AE`)

  console.log('')
  console.log('')

  console.log(`Generated ${outFile}.`)

  console.log('')
  console.log('')

  // make sure all is flushed, end/finish event of writer stream does not wait for last chunk...
  setTimeout(() => {
    const md5 = crypto.createHash('md5')
    const sha1 = crypto.createHash('sha1')
    const data = fs.readFileSync('./' + outFile)
    console.log('MD5: ' + md5.update(data).digest('hex'))
    console.log('SHA1: ' + sha1.update(data).digest('hex'))
  }, 1000)
})
