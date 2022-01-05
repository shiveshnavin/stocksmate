require('dotenv').config()
let moment = require('moment')
const FivePaisaAdapter = require('./adapters/fivepaisa/fivepaisaadapter')
const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')

// let adapter = new FivePaisaAdapter(process.env.EMAIL, process.env.PASSWORD, process.env.DOB);
let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);

let TimeBasedStratergy = require('./stratergies/timebasedstratergy')
let stock = 'SBILIFE'

async function main() {
    await adapter.init()
    console.log(adapter.name, ' adapter Initialization success')

    let profs = 0;
    let loss = 0
    let net = 0;

    const currentMoment = moment().subtract(12, 'days');
    const endMoment = moment().add(1, 'days');
    while (currentMoment.isBefore(endMoment, 'day')) {
        let cur = currentMoment.format('YYYY-MM-DD');
        currentMoment.add(1, 'days');
        let profit = await backTestDay(cur)
        if (profit != undefined) {
            if (profit > 0)
                profs++
            else
                loss++
            net += parseFloat(profit);

        }
    }

    console.log('\nProfits', profs, 'losses', loss, 'net', net.toFixed(2))



}


let trades = []
var position = 0;
var overallMargin = 20000;

let onBuy = (tick, qty, price) => {
    let margin = qty * price;
    // console.log('Buy', tick.symbol, '@', price, 'x', qty, 'Debit', margin)
    position = position + qty;
    overallMargin = overallMargin - margin;
    trades.push({ isBuy: true, datetime: Date.now(), price: price, qty: qty })
}

let onSell = (tick, qty, price) => {
    let margin = qty * price;
    // console.log('Sell', tick.symbol, '@', price, 'x', qty, 'Credit', qty * price)
    position = position - qty;
    overallMargin = overallMargin + margin;
    trades.push({ isBuy: false, datetime: Date.now(), price: price, qty: qty })
}

let getPosition = (symbol) => {
    return position;
}

let getAvailableMargin = () => {
    return overallMargin;
}

let getTrades = (symbol) => {
    return trades;
}

let timebasedstratergy = new TimeBasedStratergy();
adapter.buy = onBuy;
adapter.sell = onSell;
adapter.getAvailableMargin = getAvailableMargin;
adapter.getTrades = getTrades;
adapter.getPosition = getPosition;

timebasedstratergy.init(adapter, onBuy, onSell);

async function backTestDay(date) {
    // console.log(date)

    try {
        let ticks = await adapter.getHistoricalData('n', 'c', stock, '1m', date, date)
        // console.log('Fetched', ticks.length, 'historical ticks for', stock)
        for (let index = 0; index < ticks.length; index++) {
            const tick = ticks[index];
            await timebasedstratergy.evaluate(tick);
        }
        return timebasedstratergy.profit;
    } catch (e) {
        console.log('Error in date', date, e.message)
    }
}
main();