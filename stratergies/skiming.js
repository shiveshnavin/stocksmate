// High Volume Low Price Skimming
const moment = require('moment')
const stats = require("stats-lite")
const RateLimiter = require('limiter').RateLimiter


function removeItemOnce(arr, value) {
    var index = arr.indexOf(value);
    if (index > -1) {
        arr.splice(index, 1);
    }
    return arr;
}


class HVLPSkimStratergy {

    maxGambleAmount = 20000;
    adapter;
    onLog;
    windowSizeSeconds;
    lastNWindowTicks = [];
    waitingForOrder;
    minWindowLength = 4;
    orderCheckThrottle = new RateLimiter({ tokensPerInterval: 1, interval: "second", fireImmediately: true });

    constructor(adapter, onLog, windowSize = 5 * 60, maxGambleAmount = 20000) {
        this.adapter = adapter
        this.onLog = onLog
        this.windowSizeSeconds = windowSize
        this.maxGambleAmount = maxGambleAmount
        this.init(adapter)
    }
    init(adapter) {
    }

    /**
     * 
     * @param {Tick} tick 
     */
    evaluate(tick) {
        this._pushToWindow(tick)
        if (this.lastNWindowTicks.length > this.minWindowLength)
            return this._execute(tick)
    }

    _getWindowStats() {
        let highs = [];
        let lows = [];

        this.lastNWindowTicks.forEach(tk => {
            highs.push(tk.high)
            lows.push(tk.low)
        })

        let upperbound = stats.mode(highs)
        let lowerbound = stats.mode(lows)

        let statsData = {
            highs,
            lows,
            upperbound,
            lowerbound
        }

        return statsData;
    }

    _removeOlderThanNMins() {
        if (this.lastNWindowTicks.length == 0) {
            return
        }
        let newest = this.lastNWindowTicks[this.lastNWindowTicks.length - 1]
        let curWindowMoment = moment(newest.datetime)
        let curWindowOldestStartMoment = moment(newest.datetime).subtract(this.windowSizeSeconds, 'seconds')

        for (let index = 0; index < this.lastNWindowTicks.length; index++) {
            const element = this.lastNWindowTicks[index];
            let elemMoment = moment(element.datetime)
            if (elemMoment.isBefore(curWindowOldestStartMoment)) {
                this.lastNWindowTicks = removeItemOnce(this.lastNWindowTicks, element)
            }
        }

    }

    _pushToWindow(tick) {
        this.lastNWindowTicks.push(tick)
        this._removeOlderThanNMins()
        let stats = this._getWindowStats();

        this.onLog('Evaluating tick', 'Price=', tick.last_price, tick.datetime, JSON.stringify(stats))

    }

    async _execute(tick) {
        let that = this;
        let stats = this._getWindowStats();
        // this.onLog('Stats', stats)
        if (tick.last_price <= stats.lowerbound) {
            // this.onLog('Buy signal @', tick.last_price, ' target @', stats.upperbound)
            if (!this.waitingForOrder) {
                this.waitingForOrder = true
                let marginAvailable = { available: { live_balance: this.maxGambleAmount } };//await this.adapter.getMargins()
                let balance = marginAvailable.available.live_balance;
                let bp = parseFloat(tick.last_price);
                let sp = parseFloat(stats.upperbound);

                if (balance >= this.maxGambleAmount) {

                    let buyAmount = Math.min(this.maxGambleAmount, balance);
                    let qty = Math.floor(buyAmount / bp)
                    let buyOrder = await this.adapter.order(bp, qty, 'BUY', tick.symbol, 'LIMIT', 'NRML', 'NSE', sp, tick)
                }




            }
            else {
                // this.onLog('Cancel buy signal since waiting for order')
            }
        }


    }

    result() {

    }

}




module.exports = HVLPSkimStratergy