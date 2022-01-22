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

    let stock = stockData.tradingsymbol;
    let adapter = Zerodha({}, onLog)
    async function start(stock) {

        await adapter.init()
        // adapter.listen([stock], function (params) {
        //     console.log(params)
        // }) 

    }


    start(stock)

    return function () {
        log('Killed forcefully !')
        isKill = true;
    }

}


module.exports = trader
