module.exports = {
  rates: {
    slot_minutes: 15,
    start: 1496063100,
    end: 1497877500
  },
  blockchaininfo: {
    offset: 50
  },
  etherscan: {
    offset: 1000
  },
  ETH: {
    wei: 1000000000000000000.0,
    addresses: [
      // test addresses
      '0x29662b21A4307dec36260c8df30B001F1B7E43c9',
      '0x568038032E8af5792689B6a9c339C2D34618101b',
      // '0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8' MEW Donation Address
      // phase 1
      '0x6cC2D616E56e155D8A06E65542fdb9bD2D7f3c2E',
      '0x65f7AaDCB10BD550394387ab7DE783cea68c774d',
      '0x3D4e7B94C4Cd25318b55fB81e4a58239481f696d',
      // phase 2
      '0xBEc591De75b8699A3Ba52F073428822d0Bfc0D7e'
    ].map(obj => obj.toLowerCase()),
    test: [
      '0x29662b21A4307dec36260c8df30B001F1B7E43c9',
      '0x568038032E8af5792689B6a9c339C2D34618101b'
      // '0x7cB57B5A97eAbe94205C07890BE4c1aD31E486A8' MEW Donation Address
    ].map(obj => obj.toLowerCase())
  },
  BTC: {
    satoshi: 100000000.0,
    addresses: [
      '3D1YpQirXKZGn7ydnh6oUPWzo5WC4sd4Nc',
      '335TYuEjiWFmTYjAjN5o2CSUjbqF8WmpMz'
    ]
  },
  phases: [

    // ----------------------------------------------------

    // phase 1 start, April 3rd, 13:05 GMT
    { maxBlockTime: 1491224700, factor: 0 },

    // ----------------------------------------------------

    // PHASE 1
    // phase 1 first 24h, April 4th, 13:05 GMT
    { maxBlockTime: 1491311100, factor: 1100 },

    // phase 1 end, April 6th, 13:05 GMT
    { maxBlockTime: 1491483900, factor: 1000 },

    // ----------------------------------------------------

    // pause inbetween phases
    // 1496063100 = Mon, 29 May 2017 13:05:00 GMT
    { maxBlockTime: 1496063100, factor: 0 },

    // ----------------------------------------------------

    // first 24h of phase 2
    // 1496149500 = Tue, 30 May 2017 13:05:00 GMT
    { maxBlockTime: 1496149500, factor: 800 },

    // phase 2, end of week 1
    // 1496667900 = Mon, 05 Jun 2017 13:05:00 GMT
    { maxBlockTime: 1496667900, factor: 750 },

    // phase 2, end of week 2
    // 1497272700 = Mon, 12 Jun 2017 13:05:00 GMT
    { maxBlockTime: 1497272700, factor: 700 },

    // phase 2, end of week 3
    // 1497877500 = Mon, 19 Jun 2017 13:05:00 GMT
    { maxBlockTime: 1497877500, factor: 650 },

    // ----------------------------------------------------

    { maxBlockTime: 2497877500, factor: 0 },
    // transactions in blocks after the last `maxBlockTime` will receive 0 tokens
  ]
}
