const poloniex = require('./poloniex')
const sequelize = require('./db').get()
const Rates = require('./models/rates')(sequelize)
const config = require('./config')

const startPhase = new Date((config.rates.start) * 1000) // Mon, 29 May 2017 13:05:00 GMT
const endPhase = new Date((config.rates.end) * 1000) // Mon, 19 Jun 2017 13:05:00 GMT

let currency = process.argv[2]

console.log(`querying poloniex from ${startPhase} to ${endPhase} for ${currency}`)

poloniex.fetchExchangeRate(currency, startPhase, endPhase, function (results) {
  console.log('querying successful.')

  Rates.destroy({
    where: {
      currency: currency
    }
  }).then((rowDeleted) => {
    console.log(`Removed existing: ${rowDeleted}`)

    Rates.bulkCreate(results).then(() => {
      console.log(`Inserted: ${results.length}`)
      sequelize.close()
    })
  })
})
