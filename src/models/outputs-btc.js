const Sequelize = require('sequelize')

const OutputBTC = function (sequelize) {
  return sequelize.define('outputs_btc', {
    spent: { type: Sequelize.BOOLEAN },
    tx_index: { type: Sequelize.NUMERIC },
    type: { type: Sequelize.NUMERIC },
    addr: { type: Sequelize.STRING },
    value: { type: Sequelize.NUMERIC },
    n: { type: Sequelize.INTEGER },
    script: { type: Sequelize.TEXT }
  })
}

module.exports = OutputBTC
