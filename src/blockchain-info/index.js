const queue = require('async/queue')
const request = require('request')
const config = require('../config')

const BLOCKCHAININFO_OFFSET = config.blockchaininfo.offset

module.exports = {

  /**
   * fetches all transactions from a given address, including their inputs and outputs from blockchain.info
   */
  getTransactions: function (address, callback) {

    var results = []

    // build a request-queue, max rate of 5 requests in parallel
    var q = queue(function (task, callback) {

      let page = task.page
      let address = task.address

      let query = `https://blockchain.info/rawaddr/${address}?offset=${page * BLOCKCHAININFO_OFFSET}`

      console.log(`querying blockchain.info for transactions ${page * BLOCKCHAININFO_OFFSET} to ${(page + 1) * BLOCKCHAININFO_OFFSET}`)

      request.get(query, { json: true }, (error, response, data) => {
        if (error) {
          throw new Error(error)
        }

        console.log(`got ${data.txs.length} transactions.`)

        if (data.txs.length >= BLOCKCHAININFO_OFFSET) {
          page++
          q.push({ page: page, address: address })
        }

        // to prevent running into rate limitation, throttle the task to be > 250ms long
        setTimeout(() => {
          results.push(data.txs)
          callback()
        }, 250)
      })
    }, 5)

    q.drain = function () {
      console.log(`done.`)
      callback([].concat.apply([], results))
    }

    // fetch both internal and normal transactions, from page 0 onwards (blockchain.info begins counting at 0)
    q.push({ page: 0, address: address })
  }

}
