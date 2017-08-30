const Sequelize = require('sequelize')

const Rates = function (sequelize) {
  return sequelize.define('rates', {
    startTime: { type: Sequelize.DATE },
    endTime: { type: Sequelize.DATE },
    avgRate: { type: Sequelize.NUMERIC },
    minRate: { type: Sequelize.NUMERIC },
    maxRate: { type: Sequelize.NUMERIC },
    currency: { type: Sequelize.STRING }
  })
}

module.exports = Rates
