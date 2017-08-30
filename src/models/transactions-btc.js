const Sequelize = require('sequelize')

const BTCTransactions = function (sequelize, InputBTC, OutputBTC) {
  let model = sequelize.define('transactions_btc', {
    uuid: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
    ver: { type: Sequelize.INTEGER },
    to: { type: Sequelize.STRING },
    block_height: { type: Sequelize.NUMERIC },
    relayed_by: { type: Sequelize.STRING },
    lock_time: { type: Sequelize.NUMERIC },
    result: { type: Sequelize.NUMERIC },
    size: { type: Sequelize.NUMERIC },
    time: { type: Sequelize.NUMERIC },
    tx_index: { type: Sequelize.NUMERIC },
    vin_sz: { type: Sequelize.NUMERIC },
    hash: { type: Sequelize.STRING },
    vout_sz: { type: Sequelize.NUMERIC }
  }, {
    underscored: true,
    indexes: [{ unique: 'true', fields: ['hash'] }]
  })

  model.hasMany(InputBTC, { as: 'inputs' }, { onDelete: 'cascade' })
  model.hasMany(OutputBTC, { as: 'outputs' }, { onDelete: 'cascade' })

  return model
}

module.exports = BTCTransactions
