const etherscan = require('./etherscan')
const sequelize = require('./db').get()
const TransactionsETH = require('./models/transactions-eth')(sequelize)
const config = require('./config')

const addresses = config.ETH.addresses

// forEach address, query api.etherscan.io
let promises = addresses.map(address => {
  return new Promise((resolve, reject) => {
    console.log(`querying transactions for ETH for ${address} from api.etherscan.io`)

    etherscan.getTransactions(address, function (results) {
      // delete existing transactions
      TransactionsETH.destroy({
        where: {
          hash: { $in: results.map(obj => obj.hash) }
        }
      }).then((rowDeleted) => {
        console.log(`cleaned successful, deleted ${rowDeleted}`)

        // insert newly collected ones
        TransactionsETH.bulkCreate(results).then(() => {
          console.log(`Inserted: ${results.length}`)
          resolve()
        }).catch(err => {
          if (err) {
            console.warn(err)
          }
          console.log(results)
        })
      }).catch((err) => {
        reject(err)
      })
    })
  })
})

// close database after all is done
Promise.all(promises).then(() => {
  sequelize.close()
})
