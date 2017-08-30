const sequelize = require('./db').get()

const Rates = require('./models/rates')(sequelize)
const config = require('./config')

console.log(`inserting eth-aeternity conversion rates`)

let inserts = []

config.phases.forEach((phase, index) => {
  console.log(index)
  inserts.push({
    startTime: index > 0 ? new Date(config.phases[index - 1].maxBlockTime * 1000) : 0,
    endTime: new Date(phase.maxBlockTime * 1000),
    avgRate: phase.factor,
    minRate: phase.factor,
    maxRate: phase.factor,
    currency: 'ETH_AETERNITY'
  })
})

Rates.destroy({
  where: {
    currency: 'ETH_AETERNITY'
  }
}).then((rowDeleted) => {
  console.log(`Removed existing: ${rowDeleted}`)

  Rates.bulkCreate(inserts).then(() => {
    console.log(`Inserted: ${inserts.length}`)
    sequelize.close()
  })
})
