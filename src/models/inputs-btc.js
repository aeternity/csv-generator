const Sequelize = require('sequelize')

const InputBTC = function (sequelize) {
  return sequelize.define('inputs_btc', {
    index: { type: Sequelize.NUMERIC },
    sequence: { type: Sequelize.NUMERIC },
    prev_out_spent: { type: Sequelize.BOOLEAN },
    prev_out_tx_index: { type: Sequelize.NUMERIC },
    prev_out_type: { type: Sequelize.NUMERIC },
    prev_out_addr: { type: Sequelize.STRING },
    prev_out_value: { type: Sequelize.NUMERIC },
    prev_out_n: { type: Sequelize.NUMERIC },
    prev_out_script: { type: Sequelize.TEXT },
    script: { type: Sequelize.TEXT },
    converted_btc_address: { type: Sequelize.STRING },
    converted_eth_address: { type: Sequelize.STRING }
  })
}

module.exports = InputBTC
