const config = require('../src/config')
const chai = require('chai')
const should = chai.should()
const request = require('request')
const sequelize = require('../src/db').get()

let totalEther = {}
let addresses = config.ETH.addresses

beforeEach(() => {
  let promises = []

  addresses.forEach(address => {
    totalEther[address] = 0
    promises.push(new Promise((resolve, reject) => {
      request(`https://api.etherscan.io/api?module=account&action=balance&address=${address}`, { json: true }, (error, result, body) => {
        if (error) return reject(error)
        totalEther[address] = body.result
        resolve()
      })
    }))
  })

  return Promise.all(promises)
})

describe('Etherscan.io API', () => {

  it('the total amount of ether in our DB should correspond to what etherscan tells us', () => {
    let promises = []

    addresses.forEach(address => {
      promises.push(new Promise((resolve, reject) => {
        sequelize.query(`
                    SELECT coalesce((sum(transactions_eths."value") - (SELECT coalesce(sum(transactions_eths."value"),0) FROM transactions_eths WHERE transactions_eths."from" = '${address}' AND transactions_eths."isError" = false)), 0) as sum
                    FROM transactions_eths WHERE transactions_eths."to" = '${address}' AND transactions_eths."isError" = false
                `).spread((results, metadata) => {
            results[0].sum.should.be.eql(totalEther[address].toString())
            resolve()
          })
      }))
    })

    return Promise.all(promises)

  })

})

after(() => {
  sequelize.close()
})