let Zerodha = require('../adapters/zerodha/zerodha')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function trader(stockData, isBearTrade, onLog) {

    let jack = {};
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
        // adapter.listen([stock], function (tick) {
        //     jack.onTick(tick)
        // })

    }
    jack.getInitialPrice = function (stockData) {

 


    }
    jack.buy = function (limitPrice, qty, type /*BUY:SELL*/, symbol, order_type /*LIMIT*/) {





    }
    jack.sell = function (limitPrice, qty, type /*BUY:SELL*/, symbol, order_type /*LIMIT*/) {





    } 
    jack.onTick = function (tick) {





    }

    jack.kill = function () {
        log('Killed forcefully !')
        isKill = true;
    }

    start(stock)

    return jack;

}


module.exports = trader
