const Sequelize = require('sequelize')

const ETHTransactions = function (sequelize) {
  return sequelize.define('transactions_eth', {
    blockNumber: { type: Sequelize.INTEGER },
    blockHash: { type: Sequelize.TEXT },
    timeStamp: { type: Sequelize.INTEGER },
    hash: { type: Sequelize.TEXT },
    transactionIndex: { type: Sequelize.INTEGER },
    to: { type: Sequelize.TEXT },
    from: { type: Sequelize.TEXT },
    value: { type: Sequelize.NUMERIC },
    gas: { type: Sequelize.NUMERIC },
    gasPrice: { type: Sequelize.NUMERIC },
    input: { type: Sequelize.TEXT },
    contractAddress: { type: Sequelize.TEXT },
    cumulativeGasUsed: { type: Sequelize.NUMERIC },
    gasUsed: { type: Sequelize.NUMERIC },
    confirmations: { type: Sequelize.INTEGER },
    isError: { type: Sequelize.BOOLEAN }
  }, {
    indexes: [{ method: 'hash', fields: ['hash'] }, { method: 'hash', fields: ['from'] }, { method: 'hash', fields: ['to'] }]
  })
}

module.exports = ETHTransactions
