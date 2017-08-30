const _ = require('lodash')
const slotLength = require('../config').rates.slot_minutes
const StreamArray = require('stream-json/utils/StreamArray')
const async = require('async')
const retryable = require('async/retryable')
const request = require('request')
const ProgressBar = require('progress')
const big = require('big.js')

module.exports = {

  generateSlots: function (start, end, minutes) {
    let time = start
    let slots = []

    while (time.getTime() < end.getTime()) {
      let start = this.fitInSlot(time, minutes)

      let end = new Date(start.getTime())
      end.setMinutes(end.getMinutes() + minutes)

      slots.push({ start: start, end: end })

      time = new Date(end.getTime())
    }

    return slots
  },

  fetchExchangeRate: function (currency, start, end, callback) {

    let slots = this.generateSlots(start, end, slotLength * 4) // get longer slots from poloniex

    let requestArray = []

    let bar = new ProgressBar('querying poloniex... [:current/:total] [:bar] :rate/requests per second - :percent :etas', { total: slots.length })

    slots.forEach((slot) => {
      requestArray.push(retryable({ times: 10, interval: 5000 }, (callback) => {

        let query = `https://poloniex.com/public?command=returnTradeHistory&currencyPair=${currency}&start=${slot.start.getTime() / 1000}&end=${(slot.end.getTime() / 1000) - 1}`

        let stream = StreamArray.make()
        let timeslots = {}
        let results = []

        stream.output.on('data', (object) => {
          let obj = object.value

          let roundedTimestamp = this.fitInSlot(new Date(obj.date), slotLength)

          if (!timeslots[roundedTimestamp.getTime()]) {
            timeslots[roundedTimestamp.getTime()] = { startTime: roundedTimestamp, endTime: new Date(roundedTimestamp.getTime() + slotLength * 60 * 1000), rates: [], currency: currency }
          }

          timeslots[roundedTimestamp.getTime()].rates.push(obj)

        })

        stream.output.on('end', () => {
          let keys = Object.keys(timeslots)

          keys.forEach((key) => {
            let ratesInSlot = timeslots[key].rates

            let sum = big(0)

            ratesInSlot.forEach(o => {
              sum = sum.plus(big(o.rate))
            })

            timeslots[key].avgRate = parseFloat(sum.div(ratesInSlot.length).toFixed(5))
            timeslots[key].minRate = parseFloat(_.minBy(ratesInSlot, (o) => { return parseFloat(o.rate) }).rate)
            timeslots[key].maxRate = parseFloat(_.maxBy(ratesInSlot, (o) => { return parseFloat(o.rate) }).rate)

            results.push({
              startTime: timeslots[key].startTime,
              endTime: timeslots[key].endTime,
              currency: timeslots[key].currency,
              avgRate: timeslots[key].avgRate,
              minRate: timeslots[key].minRate,
              maxRate: timeslots[key].maxRate
            })
          })

          bar.tick()

          // make sure we don't hit the rate limit, 250ms * 5 parallel => less than 5 / per second
          callback(null, results)
        })

        stream.output.on('error', (error) => {
          callback(error)
        })

        request(query, { gzip: true, timeout: 60 * 1000, json: true }).pipe(stream.input).on('error', error => {
          callback(error)
        })
      }))
    })

    async.parallelLimit(requestArray, 3, (error, results) => {
      if (error) throw new Error(error)
      callback([].concat.apply([], results))
    })
  },

  fitInSlot: function (time, minutes) {
    let result = new Date(time)
    let slotInHour = Math.floor(result.getMinutes() / minutes)
    result.setMinutes(slotInHour * minutes)
    result.setSeconds(0)
    result.setMilliseconds(0)
    return result
  }

}
