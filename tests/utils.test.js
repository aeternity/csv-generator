const chai = require('chai')
const should = chai.should()
const config = require('../src/config')
const utils = require('../src/utils')
const blockchainInfo = require('../src/blockchain-info')
const addresses = config.BTC.addresses

describe('Utils', () => {
  it('should generate exactly same BTC address from inputscript like previous address', (done) => {
    addresses.forEach(address => {
      blockchainInfo.getTransactions(address, function (results) {
        for (var i = 0, len = results.length; i < len; i++) {
          results[i].inputs.forEach(obj => {
            if (obj.prev_out.addr.startsWith('1')) { // no multisig whatsoever
              obj.prev_out.addr.should.be.eql(utils.btcScriptToBtcAddress(obj.script))
              utils.btcScriptToEthAddress(obj.script).length.should.be.eql(42) // only sanity check we can do...
            }
          })
        }
        if (addresses[addresses.length - 1] === address) {
          done() // needed for async test, no guarantee that we really checked "all" addresses
        }
      })
    })
  })
})