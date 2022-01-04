function testBrokerage() {
    let brok = require('./brokerage')
    console.log('Intraday', brok.cal_intra(1000, 1100, 10, true))
    console.log('Delivery', brok.cal_delivery(1000, 1100, 10, true))

}

testBrokerage()