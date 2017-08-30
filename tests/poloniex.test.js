const chai = require('chai')
const should = chai.should()
const poloniex = require('../src/poloniex')
const config = require('../src/config')

const slotLength = config.rates.slot_minutes

describe('Poloniex API', () => {

  it('should generate exactly one timeslot if timestamps are within the slot length', () => {
    let slots = poloniex.generateSlots(new Date('Mon Jun 19 15:00:00 2017 GMT+2'), new Date('Mon Jun 19 15:15:00 2017 GMT+2'), slotLength)

    slots.length.should.be.eql(1)
    slots[0].start.should.be.eql(new Date('Mon Jun 19 15:00:00 2017 GMT+2'))
    slots[0].end.should.be.eql(new Date('Mon Jun 19 15:15:00 2017 GMT+2'))
  })

  it('should generate more than one timeslot if timestamps are longer than the slot length', () => {
    let slots = poloniex.generateSlots(new Date('Mon Jun 19 15:00:00 2017 GMT+2'), new Date('Mon Jun 19 15:15:01 2017 GMT+2'), slotLength)

    slots.length.should.be.eql(2)

    slots[0].start.should.be.eql(new Date('Mon Jun 19 15:00:00 2017 GMT+2'))
    slots[0].end.should.be.eql(new Date('Mon Jun 19 15:15:00 2017 GMT+2'))

    slots[1].start.should.be.eql(new Date('Mon Jun 19 15:15:00 2017 GMT+2'))
    slots[1].end.should.be.eql(new Date('Mon Jun 19 15:30:00 2017 GMT+2'))
  })

  it('should round a timestamp that is exactly at the beginning of the slot', () => {
    poloniex.fitInSlot(new Date('Mon Jun 19 15:00:00 2017 GMT+2'), slotLength).should.be.eql(new Date('Mon Jun 19 15:00:00 2017 GMT+2'))
    poloniex.fitInSlot(new Date('Mon Jun 19 15:15:00 2017 GMT+2'), slotLength).should.be.eql(new Date('Mon Jun 19 15:15:00 2017 GMT+2'))
  })

  it('should round a timestamp that is barely over the beginning of a the slot', () => {
    poloniex.fitInSlot(new Date('Mon Jun 19 15:00:01 2017 GMT+2'), slotLength).should.be.eql(new Date('Mon Jun 19 15:00:00 2017 GMT+2'))
  })

  it('should round a timestamp that is almost at a new slot to the previous one', () => {
    poloniex.fitInSlot(new Date('Mon Jun 19 15:14:59 2017 GMT+2'), slotLength).should.be.eql(new Date('Mon Jun 19 15:00:00 2017 GMT+2'))
  })

})