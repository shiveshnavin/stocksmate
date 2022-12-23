let Zerodha = require('../adapters/zerodha/zerodha')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})
let moment = require('moment')

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
let fs = require('fs')
function trader(stockData, isBearTrade, onLog) {

    let jack = {};
    let log = onLog;
    let usablableBalance = function (balance) {
        return balance * 0.45;
    }
    let usablableBackupBalance = function (balance) {
        return balance * 0.9;
    }
    let START_HRS = 9, START_MINS = 20;
    let STOP_HRS = 15, STOP_MINS = 10

    let trade = 'MIS'
    let TARGET_PROF_PER_SHARE = 20;
    let BUY_AT_MAX_FROM_PREV_DAY = 1;
    let SHORT_SELL_AT_MIN_FROM_PREV_DAY = 10;
    let FORCE_BUY = false;
    let FORCE_SELL = false;
    let FORCE_QTY = undefined;
    let FORCE_SKIP_OUTLOOK_CHECK = false;


    let stock = stockData.tradingsymbol;
    let adapter = Zerodha({}, onLog)
    async function start(stock) {

        await adapter.init()
        let file = './data'+stock+'.json';
        let buf = []
        adapter.listen([stock], function (tick) {
            tick[0].depth = undefined;
            let x = []
            if(buf.length > 10){
                if (fs.existsSync(file)) {
                    x = JSON.parse(fs.readFileSync(file).toString())
                }
                buf.forEach(element => {
                    x.push(element)
                });
                fs.writeFileSync(file, JSON.stringify(x, null, 2))  
                console.log('written')  
                buf = []
            }
            else{
                buf.push(tick[0])
            }
          
            jack.onTick(tick)
        })

    }
    jack.getInitialPrice = function (stockData) {




    }
    jack.buy = function (limitPrice, qty, type /*BUY:SELL*/, symbol, order_type /*LIMIT*/) {





    }
    jack.sell = function (limitPrice, qty, type /*BUY:SELL*/, symbol, order_type /*LIMIT*/) {





    }

    let lastTick = { abs_change: 0, last_price: 0, change: 0, total_buy_quantity: 0, total_sell_quantity: 0 }

    jack.onTick = function (ticks) {

        let tick = ticks[0]

        tick.abs_change = (tick.last_price - lastTick.last_price).toFixed(3)
        tick.change = ((tick.abs_change * 100) / lastTick.last_price).toFixed(3)
        tick.pcr = tick.total_sell_quantity / tick.total_buy_quantity
        tick.total_buy_quantity = tick.total_buy_quantity - lastTick.total_buy_quantity
        tick.total_sell_quantity = tick.total_sell_quantity - lastTick.total_sell_quantity

        lastTick = tick;
        let strip = `${c(moment(tick.last_trade_time).format('YYYY-MM-DD HH:mm:ss'))} | abs_change=${tick.abs_change < 0 ? r(tick.abs_change) : g(tick.change)} | change=${tick.change < 0 ? r(tick.change) : g(tick.change)} | last_price=${g(tick.last_price)} | sells ${tick.total_sell_quantity} | buys ${tick.total_buy_quantity} | S/B ${tick.pcr}`
        if (tick.abs_change > 0)
            log(strip)



    }

    jack.kill = function () {
        log('Killed forcefully !')
        isKill = true;
    }

    start(stock)

    return jack;

}


module.exports = trader
