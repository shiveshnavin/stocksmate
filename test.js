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
let strike = parseInt(process.argv[3]) || 17600;
let range = parseInt(process.argv[4]) || 100;

let stockDataCE = adapter.findScrip({
    "name": "NIFTY",
    "expiry": "2022-01-27",
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

    await adapter.init()
    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 20;
    let from = moment(`2022-01-${day}T09:15:00`)
    let to = moment(`2022-01-${day + 1}T15:30:00`)


    let historyCE = await adapter.getHistoricalData(stockDataCE, 'minute', from.format(formatDate), to.format(formatDate), 0)
    let historyPE = await adapter.getHistoricalData(stockDataPE, 'minute', from.format(formatDate), to.format(formatDate), 0)

    // console.log(JSON.stringify(historyCE[0].summary(), null, 2))
    // console.log(JSON.stringify(historyPE[0].summary(), null, 2))


    let ceMorning = historyCE[0];
    let peMorning = historyPE[0];


    let pal = {
        ceprofit: 0,
        ceinvestment: 0,
        cevalue: 0,
        ceBuyLimit: 0,

        peprofit: 0,
        peinvestment: 0,
        pevalue: 0,
        peBuyLimit: 0,
    }
    let lotSize = parseFloat(stockDataCE.lot_size);

    let fy = moment(`2022-01-${day - 2}T09:30:00`)
    let ty = moment(`2022-01-${day - 1}T15:30:00`)

    let historyCEY = await adapter.getHistoricalData(stockDataCE, 'day', fy.format(formatDate), ty.format(formatDate), 0)
    let historyPEY = await adapter.getHistoricalData(stockDataPE, 'day', fy.format(formatDate), ty.format(formatDate), 0)

    historyCEY = historyCEY[historyCEY.length - 1]
    historyPEY = historyPEY[historyPEY.length - 1]

    pal.ceBuyLimit = historyCEY.close
    pal.peBuyLimit = historyPEY.close

    let cePur = false;
    let pePur = false;

    console.log('Today', to)

    console.log(historyCEY.symbol, 'BUY CE @', historyCEY.datetime, historyCEY.close, 'x', lotSize, '=', pal.ceinvestment)
    console.log(historyPEY.symbol, 'BUY PE @', historyPEY.datetime, historyPEY.close, 'x', lotSize, '=', pal.peinvestment)

    for (let index = 1; index < historyCE.length; index++) {
        const ltce = historyCE[index - 1];
        const ltpe = historyPE[index - 1];

        const tce = historyCE[index];
        const tpe = historyPE[index];
        let mom = (moment(tce.datetime).format('HH:mm'))

        if (!cePur// && tce.close < pal.ceBuyLimit
        ) {
            pal.ceinvestment = tce.close * lotSize;
            cePur = true;
            console.log("PURCHASE CE @", tce.close)
        }

        if (!pePur //&& tpe.close < pal.peBuyLimit
        ) {
            pal.peinvestment = tpe.close * lotSize;
            pePur = true;
            console.log("PURCHASE PE @", tpe.close)
        }

        if (cePur) {
            pal.cevalue = (tce.close * lotSize).toFixed(2);
            pal.ceprofit = (pal.cevalue - pal.ceinvestment).toFixed(2)
        }

        if (pePur) {
            pal.pevalue = (tpe.close * lotSize).toFixed(2)
            pal.peprofit = (pal.pevalue - pal.peinvestment).toFixed(2)
        }
        pal.net = parseFloat(pal.ceprofit) + parseFloat(pal.peprofit)

        if (mom.indexOf('16') > -1)
            console.log(b(mom), '[CE', (tce.close - ltce.close > 0 ? g(tce.close) : r(tce.close)),
                'Profit',
                (pal.ceprofit > 0 ? g(pal.ceprofit) : r(pal.ceprofit)),
                ']',
                '---',
                '[PE', (tpe.close - ltpe.close > 0 ? g(tpe.close) : r(tpe.close)),
                'Profit',
                (pal.peprofit > 0 ? g(pal.peprofit) : r(pal.peprofit)),
                ']', (pal.net > 0 ? g(pal.net) : r(pal.net)))

    }

    console.log(pal)

    // trader(stockDataCE, false, function (params) {
    //     console.log(params)
    // })
}

startTest() 