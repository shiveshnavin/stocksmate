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

    // return adapter;

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
const brokerage = require('../archive/brokerage');
let strike = parseInt(process.argv[3]) || 17800;
let range = parseInt(process.argv[4]) || 0;




async function startTest() {

    let adapter = await initAdapter(process.env.Z_USERID, process.env.Z_PASSWORD, process.env.Z_TOTP_KEY, false)
    let trader = new HVLPSkimStratergy(adapter, onLog)
    let testOrders = []
    function testOrder(limit_price, qty, type, symbol, order_type, trade, exchange, sp, tick) {
        let id = Date.now()
        let order = {
            sp,
            limit_price, qty, type, symbol, order_type, trade, exchange, timestamp: tick.datetime, id
        }
        testOrders.push(order)
        // console.log(type, 'Order Placed ', symbol, 'x', qty, '@ Rs.', limit_price, ' at ', order.timestamp)
        return order
    }
    function evaluatePendingOrders(tick) {
        testOrders.forEach(async ord => {

            if (ord.status != 'COMPLETED') {
                if (ord.type == 'BUY') {
                    if (tick.last_price <= ord.limit_price) {
                        // console.log(ord.type, 'Order Completed ', ord.symbol, 'x', ord.qty, '@ Rs.', ord.limit_price, ' at ', moment(tick.datetime).format('YYYY-MM-DD+HH:mm:ss'))
                        ord.status = 'COMPLETED'
                        // testOrdersPromises[ord.id]()
                        let sellorder = adapter.order(ord.sp, ord.qty, 'SELL', ord.symbol, 'LIMIT', 'NRML', 'NSE', 0, tick)

                    }
                }
                else if (ord.type == 'SELL') {

                    if (tick.last_price >= ord.limit_price) {
                        // console.log(ord.type, 'Order Completed ', ord.symbol, 'x', ord.qty, '@ Rs.', ord.limit_price, ' at ', moment(tick.datetime).format('YYYY-MM-DD+HH:mm:ss'))
                        ord.status = 'COMPLETED'
                        // testOrdersPromises[ord.id]()
                        trader.waitingForOrder = false;

                    }
                    else if (moment(ord.timestamp).isBefore(moment(tick.datetime).subtract(5, 'minutes'))) {
                        ord.limit_price = tick.last_price
                        // console.log(ord.type, 'Order Completed with Atloss ', ord.symbol, 'x', ord.qty, '@ Rs.', ord.limit_price, ' at ', moment(tick.datetime).format('YYYY-MM-DD+HH:mm:ss'))
                        ord.status = 'COMPLETED'
                        // testOrdersPromises[ord.id]()
                        trader.waitingForOrder = false;
                    }
                }
            }
        })
    }
    adapter.order = testOrder;

    let testOrdersPromises = {}
    adapter.waitTillOrderIsExecuted = function (orderId, type) {

        let promis = new Promise((res, rej) => {
            testOrdersPromises[orderId] = res
        })

        return promis
    }


    let scip = adapter.findScrip({
        "tradingsymbol": "IDEA",
        "instrument_type": "EQ",
        "segment": "NSE",
        "exchange": "NSE"
    })

    console.log(scip)

    // adapter.order(7.0, 2, 'BUY', 'IDEA', 'LIMIT', 'NRML', 'NSE')

    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 2;
    // let durationInFutureDays = 4;
    // let from = moment(`2022-01-${day < 10 ? `0${day}` : day}T09:15:00`)
    // let to = moment(`2023-01-${day + durationInFutureDays < 10 ? `0${day + durationInFutureDays}` : day}T15:30:00`)


    let from = moment(`2022-11-08T09:15:00`)
    let to = moment(`2023-01-06T15:30:00`)


    for (var tStart = moment(from); tStart.isBetween(from, to, 'day', '[]'); tStart.add(1, 'days')) {
        let tEnd = tStart.clone().add(6, 'hours')
        console.log(tStart.format(formatDate), '<->', tEnd.format(formatDate));
        trader = new HVLPSkimStratergy(adapter, onLog)

        let file = `../test_IDEA_${tStart.format('YYYY_MM_DD')}.json`
        let historyToday =
            require(file)
        //     await adapter.getHistoricalData(scip, 'minute', tStart.format(formatDate), tEnd.format(formatDate), 0)
        // fs.writeFileSync(file, JSON.stringify(historyToday, null, 2))

        if (historyToday.length < 10) {
            onLog("Skip ", tStart, 'probably a holiday')
            continue
        }
        for (let index = 0; index < historyToday.length; index++) {
            const tick = historyToday[index];
            evaluatePendingOrders(tick)
            await trader.evaluate(tick)
        }


        let stockStats = {
            totalBuy: 0,
            totalSell: 0,

            losses: 0,
            profits: 0,
            breakevenLoss: 0,

            profit: 0,
            profit2: 0,
        }

        trader.waitingForOrder = false
        let lastBuy = 0;
        testOrders.forEach(o => {
            if (o.type == 'BUY') {
                lastBuy = o;
            }
            else {

                let bork = brokerage.cal_intra(lastBuy.limit_price, o.limit_price, lastBuy.qty, true)
                let profit = bork.net_profit
                if (profit > 0) {
                    stockStats.profits++
                }
                else if (profit < 0) {
                    stockStats.losses++
                }
                else if (profit == 0) {
                    stockStats.breakevenLoss++
                }
                stockStats.totalSell += (o.limit_price) * lastBuy.qty
                stockStats.totalBuy += (lastBuy.limit_price) * lastBuy.qty
                // onLog('Buy@', lastBuy.limit_price, 'Sell@', o.limit_price, 'Profit', profit, lastBuy.qty, o.qty, 'bork', (bork.brokerage + bork.total_tax))
                stockStats.profit += profit
            }

        })
        stockStats.profit -= 15.93
        stockStats.profit2 = stockStats.totalSell - stockStats.totalBuy
        console.log(tStart.format(formatDate), JSON.stringify(stockStats, null, 2))
        testOrders = []

    }





}

startTest() 