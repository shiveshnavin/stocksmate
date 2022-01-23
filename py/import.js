let moment = require('moment')
require('dotenv').config()
let fs = require('fs')
let adapter = require('../adapters/zerodha/zerodha')()


async function start(params) {
    await adapter.init();
    let stockData = adapter.findScrip({
        "tradingsymbol": "HDFCBANK",
        "expiry": "",
        "strike": "0",
        "instrument_type": "EQ",
        "segment": "NSE",
        "exchange": "NSE"
    })
    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 20;
    let from = moment(`2022-01-01T09:15:00`)
    let to = moment(`2022-01-21T15:30:00`)


    let historyCE = await adapter.getHistoricalData(stockData, 'minute', from.format(formatDate), to.format(formatDate), 0, true)
    fs.writeFileSync('./py/data.json', JSON.stringify(historyCE, null, 2))
    console.log(historyCE.length, 'rows exported for', from.format(formatDate), 'till', to.format(formatDate))
}

start();