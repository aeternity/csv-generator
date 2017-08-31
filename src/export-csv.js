const csvWriter = require('csv-write-stream')
const fs = require('fs')
const sequelize = require('./db').get()
const async = require('async')
const big = require('big.js')
const config = require('./config')
const crypto = require('crypto')

const wei = config.ETH.wei
const satoshi = config.BTC.satoshi

const outFile = process.argv[2] || 'contributions.csv'

// test addresses
const testAddresses = config.ETH.test

// 6h cutoff
const capReached = 1497010079
const capReached6h = capReached + 60 * 60 * 6 // reached at tx 0x140b315651bbf08c2b84fdd970fdfce2c053f4b40fc7260d7f1919fe2b0d1d6a

// spam cutoff
const spamCutOffUSD = 0.05 // 5 cent cutoff
let spamCounter = 0
let spamValue = big(0)

// sanity checks
let btcPhaseTest = big(0)
let ethPhaseTest = big(0)
let ethPhase1 = big(0)
let ethPhase2 = big(0)
let ethPhase2late = big(0)
let btcPhase1 = big(0)
let btcPhase2 = big(0)
let btcPhase2late = big(0)

let ethTest = big(0)

let aePhase1 = big(0)
let aePhase2 = big(0)

let aeTotal = big(0)
let aeTest = big(0)

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
                AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
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
   * Before Phase 1 - Get all ETH Contributions
   */
  (callback) => {
    sequelize.query(`
            SELECT *,(transactions_eths.value*cast(${config.phases.find(obj => obj.maxBlockTime === 1491311100).factor} as numeric))/1000000000000000000.0 AS aeternityTokens FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
                WHERE 
                    (
                        LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') --- Phase 2
                        OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') --- TEST
                        OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') --- TEST
                    )
                    AND rates.currency='ETH_AETERNITY'
                    AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
                    AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
                    AND transactions_eths."timeStamp"<1491224700   --- this is just when phase 1 starts
                    AND transactions_eths."isError" is FALSE
                    
        `).spread((results, metadata) => {
          results.forEach(result => {
            //special case
            if(result.from === '0xb8250d3875dd3fafefa36bd8055d926642f1deb2') {
              console.log('...');
              result.from = '0x74053BebBA72AE4b6fC8d375123Ff60AF4BB7B2b';
            }
            csvArray.push([
              result.from, // from
              result.aeternitytokens, // ae tokens
              result.to, // to
              result.value, // amount (eth)
              'ETH', // currency
              '0', // fiat usd
              '', // cumulative usd
              result.timeStamp, // time
              result.hash, // transaction id
              '0', // phase
              result.from // from
            ])

            ethPhaseTest = ethPhaseTest.plus(big(result.value))
            aeTotal = aeTotal.plus(big(result.aeternitytokens))

            if (testAddresses.indexOf(result.to) !== -1) {
              aeTest = aeTest.plus(big(result.aeternitytokens))
              ethTest = ethTest.plus(big(result.value))
            }
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
                AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
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
              result.converted_btc_address // from
            ])

            btcPhase1 = btcPhase1.plus(big(result.value))
            aeTotal = aeTotal.plus(big(result.aeternitytokens))
            aePhase1 = aePhase1.plus(big(result.aeternitytokens))
          })

          callback(null)
        })
  },

  /**
   * Phase 1 - Get all ETH Contributions
   */
  (callback) => {
    sequelize.query(`
            SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS aeternityTokens FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
                WHERE 
                    (
                        LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') --- Phase 2
                        OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') --- Phase 1
                        OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') --- TEST
                        OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') --- TEST
                    )
                    AND rates.currency='ETH_AETERNITY'
                    AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
                    AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
                    AND transactions_eths."timeStamp">1491224700   --- this is just when phase 1 starts
                    AND transactions_eths."timeStamp"<1496063100
                    AND transactions_eths."isError" is FALSE
                    
        `).spread((results, metadata) => {

          results.forEach(result => {
            csvArray.push([
              result.from, // from
              result.aeternitytokens, // ae tokens
              result.to, // to
              result.value, // amount (eth)
              'ETH', // currency
              '0', // fiat usd
              '', // cumulative usd
              result.timeStamp, // time
              result.hash, // transaction id
              '1', // phase
              result.from
            ])

            ethPhase1 = ethPhase1.plus(big(result.value))
            aeTotal = aeTotal.plus(big(result.aeternitytokens))
            aePhase1 = aePhase1.plus(big(result.aeternitytokens))

            if (testAddresses.indexOf(result.to) !== -1) {
              aeTest = aeTest.plus(big(result.aeternitytokens))
              ethTest = ethTest.plus(big(result.value))
            }
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
                        AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
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
                    AND inputs_btcs.converted_eth_address NOTNULL  --- removes all invalid addresses
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
                result.converted_btc_address
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
  },

  /**
   * Phase 2 - Get all ETH Contributions
   */
  (callback) => {
    sequelize.query(`
        SELECT *,(transactions_eths.value*rates."avgRate")/1000000000000000000.0 AS aeternityTokens,
          (SELECT rates."avgRate" FROM rates WHERE rates.currency = 'USDT_ETH'
        AND extract(epoch FROM rates."startTime" AT TIME zone 'utc') > transactions_eths."timeStamp" ORDER BY rates."startTime" ASC LIMIT 1) * (transactions_eths.value / 1000000000000000000.0) as usdvalue
          FROM transactions_eths,rates --- 1000000000000000000.0 wei to ether rate
            WHERE 
                (
                    LOWER(transactions_eths.to)=LOWER('0x6cc2d616e56e155d8a06e65542fdb9bd2d7f3c2e') --- Phase 1
                    OR LOWER(transactions_eths.to)=LOWER('0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e') --- Phase 2
                    OR LOWER(transactions_eths.to)=LOWER('0x65f7AaDCB10BD550394387ab7DE783cea68c774d') --- Phase 1
                    OR LOWER(transactions_eths.to)=LOWER('0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d') --- Phase 1
                    OR LOWER(transactions_eths.to)=LOWER('0x29662b21A4307dec36260c8df30B001F1B7E43c9') --- TEST
                    OR LOWER(transactions_eths.to)=LOWER('0x568038032E8af5792689B6a9c339C2D34618101b') --- TEST
                )
                AND rates.currency='ETH_AETERNITY'
                AND extract(epoch FROM rates."startTime" AT TIME zone 'utc')<transactions_eths."timeStamp" --- join on the rates
                AND extract(epoch FROM rates."endTime" AT TIME zone 'utc')>transactions_eths."timeStamp" --- join on the rates
                AND transactions_eths."timeStamp">1496063100 
                AND transactions_eths."isError" is FALSE
        `).spread((results, metadata) => {
          results.forEach(result => {
            if (result.usdvalue >= spamCutOffUSD) {
              let tokens = result.timeStamp > capReached6h ? 0 : result.aeternitytokens

              csvArray.push([
                result.from, // from
                tokens, // ae tokens
                result.to, // to
                result.value, // amount (eth)
                'ETH', // currency
                result.usdvalue, // fiat usd
                '', // cumulative usd
                result.timeStamp, // time
                result.hash, // transaction id
                result.timeStamp > capReached6h ? '2-late' : '2', // phase
                result.from
              ])

              if (result.timeStamp > capReached6h) {
                ethPhase2late = ethPhase2late.plus(big(result.value))
              } else {
                ethPhase2 = ethPhase2.plus(big(result.value))
              }

              aeTotal = aeTotal.plus(big(tokens))
              aePhase2 = aePhase2.plus(big(tokens))

              if (testAddresses.indexOf(result.to) !== -1) {
                aeTest = aeTest.plus(big(tokens))
                ethTest = ethTest.plus(big(result.value))
              }
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

  console.log('')
  console.log('')

  console.log('ETH Pre Phase 1:', ethPhaseTest.div(wei).toFixed(10), 'ETH')
  console.log('BTC Pre Phase 1:', btcPhaseTest.div(satoshi).toFixed(10), 'BTC')

  console.log('')

  console.log('ETH Phase 1:', ethPhase1.div(wei).toFixed(10), 'ETH')
  console.log('BTC Phase 1:', btcPhase1.div(satoshi).toFixed(10), 'BTC')
  console.log('ETH Phase 2:', ethPhase2.div(wei).toFixed(10), 'ETH')
  console.log('BTC Phase 2:', btcPhase2.div(satoshi).toFixed(10), 'BTC')

  console.log('ETH Test-Addresses:', ethTest.div(wei).toFixed(10), 'ETH')

  console.log('USD Cumulative Phase 2:', csvArray[csvArray.length - 1][6].toFixed(10), 'USD')
  console.log('Filtered Out SpamTx:', spamCounter, ' | Worth:', spamValue.toFixed(10), 'USD')

  console.log('')
  console.log('')

  console.log('ETH Total:', (ethPhaseTest.plus(ethPhase1).plus(ethPhase2)).div(wei).toFixed(10), 'ETH')
  console.log('BTC Total:', (btcPhaseTest.plus(btcPhase1).plus(btcPhase2)).div(satoshi).toFixed(10), 'BTC')

  console.log('')

  // aeTotal is all AE generated, including testAddresses. therefore, subtract this first. contributors get 82%
  const ae100 = ((aeTotal - aeTest) / 82) * 100

  // aeternity gets 17%
  const aeAeternity = ae100 * 0.17

  // contributors get 82%
  const aeContributors = aeTotal - aeTest

  // reserved for mainnet launch 1%

  console.log(`AE Phase 1`, aePhase1.toFixed(10))
  console.log(`AE Phase 2`, aePhase2.toFixed(10))

  const aeMainNet = ae100 * 0.01

  console.log(`AE (17%) Aeternity: ${aeAeternity} AE, (${aeTest} AE of it given to Test-Address Contributions)`)
  console.log(`AE (82%) Contributors: ${aeContributors} AE`)
  console.log(`AE (1%) Mainnet Launch ${aeMainNet} AE`)

  console.log('')

  console.log(`AE (100%): ${ae100} AE === ${aeAeternity + aeContributors + aeMainNet}`)

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
