const bitcoinjs = require('bitcoinjs-lib')
const ethereumjs = require('ethereumjs-lib')

module.exports = {
  btcScriptToEthAddress: function (inputScript) {
    const scriptBuffer = Buffer.from(inputScript, 'hex')
    const chunks = bitcoinjs.script.decompile(scriptBuffer)
    if (ethereumjs.util.isValidPublic(chunks[1], true)) {
      return '0x' + ethereumjs.util.pubToAddress(chunks[1], true).toString('hex')
    }
  },
  btcScriptToBtcAddress: function (inputScript) {
    const scriptBuffer = Buffer.from(inputScript, 'hex')
    const chunks = bitcoinjs.script.decompile(scriptBuffer)
    return bitcoinjs.ECPair.fromPublicKeyBuffer(chunks[1], bitcoinjs.networks.mainnet).getAddress().toString()
  }
}
