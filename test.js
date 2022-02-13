let trader = require('./stratergies/optionsbracket')
require('dotenv').config()
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})
let moment = require('moment')

let adapter = require('./adapters/zerodha/zerodha')()
let strike = parseInt(process.argv[3]) || 17800;
let range = parseInt(process.argv[4]) || 0;

let stockDataCE = adapter.findScrip({
    "name": "NIFTY",
    "expiry": "2022-02-24",
    "strike": "" + (strike + range),
    "instrument_type": "CE",
    "segment": "NFO-OPT",
    "exchange": "NFO"
})
let stockDataPE = adapter.findScrip({
    "name": "NIFTY",
    "expiry": "2022-01-27",
    "strike": "" + (strike - range),
    "instrument_type": "PE",
    "segment": "NFO-OPT",
    "exchange": "NFO"
})
async function startTest() {

    // await adapter.init()
    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 20;
    let from = moment(`2022-01-${day}T09:15:00`)
    let to = moment(`2022-01-${day + 1}T15:30:00`)

    trader(stockDataCE, false, function (params) {
        console.log(params)
    })
}

startTest() 