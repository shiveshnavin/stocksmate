let trader = require('./stratergies/optionsbracket')
require('dotenv').config()

let adapter = require('./adapters/zerodha/zerodha')()
let stock = adapter.findScrip({
    "name": "NIFTY",
    "expiry": "2022-01-27",
    "strike": "18200",
    "instrument_type": "PE",
    "segment": "NFO-OPT",
    "exchange": "NFO"
})

async function startTest() {

    await adapter.init()
    let history = await adapter.getHistoricalData(stock.instrument_token, '5minute', '2022-01-21+09:30:00', '2022-01-21+15:30:00', 0)

    trader(stock, false, function (params) {
        console.log(params)
    })
}

startTest() 