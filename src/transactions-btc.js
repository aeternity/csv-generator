const utils = require('./utils')
const blockchainInfo = require('./blockchain-info')
const sequelize = require('./db').get()

const InputBTC = require('./models/inputs-btc')(sequelize)
const OutputBTC = require('./models/outputs-btc')(sequelize)
const TransactionsBTC = require('./models/transactions-btc')(sequelize, InputBTC, OutputBTC)
const config = require('./config')

// used BTC addresses
const addresses = config.BTC.addresses

// forEach address, query api.etherscan.io
let promises = addresses.map(address => {
  return new Promise((resolve, reject) => {
    console.log(`querying transactions for BTC for ${address} from blockchain.info`)

    blockchainInfo.getTransactions(address, function (results) {

      // delete existing transactions first
      TransactionsBTC.destroy({
        where: {
          hash: { $in: results.map(obj => obj.hash) }
        }
      }).then((rowDeleted) => {
        console.log(`cleaned successful, deleted ${rowDeleted}`)
        console.log(`inserting ${results.length} transactions...`)

        results.forEach(result => {
          for (var i = 0, len = result.inputs.length; i < len; i++) {
            let obj = result.inputs[i]
            obj.index = i
            obj.prev_out_spent = obj.prev_out.spent
            obj.prev_out_tx_index = obj.prev_out.tx_index
            obj.prev_out_type = obj.prev_out.type
            obj.prev_out_addr = obj.prev_out.addr
            obj.prev_out_value = obj.prev_out.value
            obj.prev_out_n = obj.prev_out.n
            obj.prev_out_script = obj.prev_out.script
            if (obj.prev_out.addr.startsWith('1')) {
              obj.converted_btc_address = utils.btcScriptToBtcAddress(obj.script)
              obj.converted_eth_address = utils.btcScriptToEthAddress(obj.script)
            }
            delete obj.prev_out
          }
          result.outputs = result.out
          delete result.out
          // result.to = address this is a wrong assumption
        })

        sequelize.transaction().then((t) => {
          let promises = []
          results.forEach(result => {
            promises.push(TransactionsBTC.create(result, { transaction: t, include: [{ model: InputBTC, as: 'inputs' }, { model: OutputBTC, as: 'outputs' }] }))
          })
          return Promise.all(promises).then(function () {
            return t.commit()
          }).catch(function (err) {
            console.log(err)
            return t.rollback()
          })
        }).then(() => {
          console.log(`inserted: ${results.length}`)
          resolve()
        }).catch((err) => {
          reject(err)
        })
      })
    })
  })
})

// close database after all is done
Promise.all(promises).then(() => {
  sequelize.close()
})
