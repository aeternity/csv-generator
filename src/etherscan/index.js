const queue = require('async/queue')
const request = require('request')
const config = require('../config')
const ETHERSCAN_OFFSET = config.etherscan.offset

module.exports = {

  /**
   * fetches all transactions including internal (if contract) from a certain ether-address using api.etherscan.io
   */
  getTransactions: function (address, callback) {

    var results = []

    // build a request-queue, max rate of 5 requests in parallel
    var q = queue(function (task, callback) {

      let page = task.page
      let address = task.address
      let action = task.action

      let query = `https://api.etherscan.io/api?module=account&action=${action}&address=${address}&startblock=0&endblock=latest&page=${page}&offset=${ETHERSCAN_OFFSET}&sort=asc&apikey=${process.env.ETHERSCAN_API_TOKEN}`

      console.log(`querying api.etherscan.io for transaction ${(page - 1) * ETHERSCAN_OFFSET} to ${page * ETHERSCAN_OFFSET}, page ${page}`)

      request.get(query, { json: true }, (error, response, data) => {
        if (error) {
          throw new Error(error)
        }

        console.log(`got ${data.result.length} transactions.`)

        if (data.result.length >= ETHERSCAN_OFFSET) {
          page++
          q.push({ action: action, page: page, address: address })
        }

        // to prevent running into rate limitation, throttle the task to be > 250ms long
        setTimeout(() => {
          results.push(data.result)
          callback()
        }, 500)
      })
    }, 5)

    q.drain = function () {
      console.log(`done.`)
      callback([].concat.apply([], results))
    }

    // fetch both internal and normal transactions, from page 1 onwards
    q.push({ action: 'txlistinternal', page: 1, address: address })
    q.push({ action: 'txlist', page: 1, address: address })
  }

}
