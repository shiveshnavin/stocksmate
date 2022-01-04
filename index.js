require('dotenv').config()
const FivePaisaAdapter = require('./adapters/fivepaisa/fivepaisaadapter')

let adapter = new FivePaisaAdapter();
let TimeBasedStratergy = require('./stratergies/timebasedstratergy')
let stock = 'INFY'

async function main() {
    await adapter.init(process.env.EMAIL, process.env.PASSWORD, process.env.DOB)
    console.log(adapter.name, ' adapter Initialization success')
    // console.log(JSON.stringify(ticks, null, 2))
    // try {
    //     let live = await adapter.getMarketFeed('n', 'c', stock)
    //     console.log(live)
    // } catch (e) {
    //     if (e == 'Success')
    //         console.log('No data avalable')
    //     else
    //         console.log(e.message)
    // }

    for (let index = 10; index < 28; index++) {
        await backTestDay(index + '-12-2021')
    }



}

async function backTestDay(date) {
    // console.log(date)
    let trades = []
    var position = 0;
    var overallMargin = 10000;

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

    try {
        let ticks = await adapter.fetchHistoricalData('n', 'c', stock, '1m', date, date)
        // console.log('Fetched', ticks.length, 'historical ticks for', stock)
        for (let index = 0; index < ticks.length; index++) {
            const tick = ticks[index];
            await timebasedstratergy.evaluate(tick);
        }
    } catch (e) {
        // console.log('Error in date', date, e.message)
    }
}
main();