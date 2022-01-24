let moment = require('moment')
require('dotenv').config()
let fs = require('fs')
let adapter = require('../adapters/zerodha/zerodha')()


async function start(params) {
    await adapter.init();
    // let stockData = adapter.findScrip({
    //     "tradingsymbol": "HDFCBANK",
    //     "expiry": "",
    //     "strike": "0",
    //     "instrument_type": "EQ",
    //     "segment": "NSE",
    //     "exchange": "NSE"
    // })
    let stockData = adapter.findScrip({
        "name": "NIFTY",
        "expiry": "2022-02-03",
        "strike": "16500",
        "instrument_type": "PE",
        "segment": "NFO-OPT",
        "exchange": "NFO"
    })
    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    // let day = parseInt(process.argv[2]) || 20;
    let from = moment(`2022-01-18T09:15:00`)
    let to = moment();//`2022-01-21T15:30:00`


    let dur = process.argv[2] || 'minute';
    let historyCE = await adapter.getHistoricalData(stockData, dur, from.format(formatDate), to.format(formatDate), 0, true)
    fs.writeFileSync('./py/data_'+dur+'.json', JSON.stringify(historyCE, null, 2))
    console.log(historyCE.length, 'rows exported for', from.format(formatDate), 'till', to.format(formatDate))
}

start();