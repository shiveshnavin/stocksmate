require('dotenv').config()
const zerodha = require("../adapters/zerodha/zerodha");
const Tick = require('../dao/tick')
const FireStoreDB = require('multi-db-orm').FireStoreDB
const fs = require('fs')


const creds = JSON.parse(fs.readFileSync('./credentials.json').toString())
const multiDb = new FireStoreDB(creds)
let db = multiDb.db;
let onLog = console.log

let adapters = {

}

async function initAdapter(userid, password, totpKey, isRetry) {
    let adapter = zerodha({
        username: userid,
        password: password,
        totp_key: totpKey
    }, console.log)

    let existingLogin = await multiDb.getOne('stocksmate_logins', { id: userid })
    if (!existingLogin) {
        existingLogin = await adapter.init()
        await multiDb.insert('stocksmate_logins', existingLogin)
    }
    else {
        await adapter.init(existingLogin)
        onLog('Zerodha using cached credentials')
    }

    try {
        let data = await adapter.getProfile()
        onLog('Zerodha Connected to user', data.user_name)
    } catch (e) {
        onLog('Zerodha Error logging in...', !isRetry ? 'retrying' : '')
        await multiDb.delete('stocksmate_logins', { id: userid })
        if (!isRetry)
            initAdapter(userid, password, totpKey, true)
    }

    adapters[userid] = adapter
    return adapter;
}


////////////////////////////////////////////////////

const HVLPSkimStratergy = require('../stratergies/skiming')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})
const moment = require('moment');
let strike = parseInt(process.argv[3]) || 17800;
let range = parseInt(process.argv[4]) || 0;




async function startTest() {

    let adapter = await initAdapter(process.env.Z_USERID, process.env.Z_PASSWORD, process.env.Z_TOTP_KEY, false)
    let trader = new HVLPSkimStratergy(adapter, onLog)
    let testOrders = []
    async function testOrder(limit_price, qty, type, symbol, order_type, trade, exchange) {
        let order = {
            limit_price, qty, type, symbol, order_type, trade, exchange, timestamp: Date.now()
        }
        testOrders.push(order)
        console.log('Order Placed ', symbol, 'x', qty, '@ Rs.', limit_price, ' at ', moment().format('YYYY-MM-DD+HH:mm:ss'))
    }
    adapter.order = testOrder;

    let scip = adapter.findScrip({
        "tradingsymbol": "IDEA",
        "instrument_type": "EQ",
        "segment": "NSE",
        "exchange": "NSE"
    })

    console.log(scip)

    adapter.order(7.0, 2, 'BUY', 'IDEA', 'LIMIT', 'NRML', 'NSE')

    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 2;
    let from = moment(`2023-01-${day < 10 ? `0${day}` : day}T09:15:00`)
    let to = moment(`2023-01-${day + 1 < 10 ? `0${day + 1}` : day}T15:30:00`)

    for (var tStart = moment(from); tStart.diff(to, 'days') <= 0; tStart.add(1, 'days')) {
        let tEnd = tStart.clone().add(6, 'hours')
        console.log(tStart.format(formatDate));

        let historyToday = await adapter.getHistoricalData(scip, 'minute', tStart.format(formatDate), tEnd.format(formatDate), 0)
        historyToday.forEach(tick => {
            trader.evaluate(tick)
        })

    }




}

startTest() 