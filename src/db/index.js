require('dotenv').config()

const Sequelize = require('sequelize')
const pg = require('pg')

const dbName = process.env.POSTGRES_DATABASE || 'aeternitytoken'
const dbUser = process.env.POSTGRES_USER || 'postgres'
const dbPassword = process.env.POSTGRES_PASSWORD || 'admin'
const dbHost = process.env.POSTGRES_HOST || 'localhost'

let Rates, InputsBTC, OutputsBTC, TransactionsBTC, TransactionsETH, sequelize

module.exports = {

  get: function () {
    sequelize = new Sequelize(dbName, dbUser, dbPassword, {
      host: dbHost,
      logging: false,
      dialect: 'postgres'
    })

    Rates = require('../models/rates')(sequelize)
    InputsBTC = require('../models/inputs-btc')(sequelize)
    OutputsBTC = require('../models/outputs-btc')(sequelize)
    TransactionsBTC = require('../models/transactions-btc')(sequelize, InputsBTC, OutputsBTC)
    TransactionsETH = require('../models/transactions-eth')(sequelize)

    return sequelize
  },

  drop: function () {
    return Promise.all([
      InputsBTC.drop(),
      OutputsBTC.drop()
    ]).then(() => {
      return Promise.all([
        TransactionsBTC.drop(),
        TransactionsETH.drop(),
        Rates.drop()
      ])
    })
  },

  close: function () {
    return sequelize.close()
  },

  create: function () {
    console.log('creating database if necessary...')
    return new Promise((resolve, reject) => {
      let client = new pg.Client({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        database: 'postgres'
      })
      client.connect((err) => {
        if (err) {
          console.warn('connection failed.')
          return reject(err)
        }

        client.query('CREATE DATABASE ' + dbName).then(result => {
          console.log('db created.')
          client.end()
          return resolve(result)
        }, err => {
          console.log('db exists. thats good!')
          client.end()
          return resolve(err)
        })
      })
    })
  },

  sync: function (force) {
    return Promise.all([
      TransactionsBTC.sync({ force: force }),
      TransactionsETH.sync({ force: force }),
      Rates.sync({ force: force })
    ]).then(() => {
      return Promise.all([
        InputsBTC.sync({ force: force }),
        OutputsBTC.sync({ force: force })
      ])
    })
  }
}
