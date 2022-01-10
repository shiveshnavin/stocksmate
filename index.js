require('dotenv').config()
let moment = require('moment')
const fetch = require('node-fetch');
const zlogin = require('./adapters/zerodha/login')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')
let SimpleTimeBasedStratergy = require('./stratergies/simpletimestratergy')
var axios = require('axios');
let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);
let bCalc = require('./brokerage')
let KiteTicker = require('./adapters/zerodha/ticker')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})



/***************CONFIG***************/
let stock = 'HDFCBANK'
let Z_USERID = process.env.Z_USERID
let Z_PASSWORD = process.env.Z_PASSWORD
let Z_PIN = process.env.Z_PIN

let enctoken = ""
let kf_session = ""
let public_token = ""
let usablableBalance = function (balance) {
    return balance * 0.45;
}
let usablableBackupBalance = function (balance) {
    return balance * 0.9;
}
let START_HRS = 9, START_MINS = 20;
let STOP_HRS = 15, STOP_MINS = 10

let trade = 'MIS'
let TARGET_PROF_PER_SHARE = 10;
let BUY_AT_MAX_FROM_PREV_DAY = 1;
let FORCE_BUY = false;
let FORCE_SELL = false;
let FORCE_QTY = undefined;
let FORCE_SKIP_OUTLOOK_CHECK = false;

let calculator = trade == 'MIS' ? bCalc.cal_intra : bCalc.cal_delivery
/*****************************

-----------------------------
My Simple stratergy is to:  |
-----------------------------
HALT TRADING FOR DAY IF ASIAN MARKET ENDS UP IN RED OR ANY BAD NEWS/MANUAL OVERRIDE
Get the CLOSING_PRICE of prev day or before market open price today and 
get the CASH_MARGIN with me
place the order to buy at prev day CLOSING_PRICE + 1 with QTY as my CASH_MARGIN * 0.9
wait till the order is open . in case order is cancelled , keep repeating the order to buy
if order is open. wait for order to be executed
when order is executed . place an order to sell at limit + X (say X=7rs) amount based on profit

>>> This stratergy can incur huge losses if market has a gap down opening

-----------------------------
My Backup stratergy is to:  |
-----------------------------
HALT TRADING FOR DAY IF ASIAN MARKET ENDS UP IN RED OR ANY BAD NEWS/MANUAL OVERRIDE
Get the CLOSING_PRICE of prev day or before market open price today = LIMIT_BUY_PRICE 
get the CASH_MARGIN with me
place the order to buy at prev day LIMIT_BUY_PRICE + 0.5 with QTY as my CASH_MARGIN * 0.45
wait till the order is open . in case order is cancelled , keep repeating the order to buy
if order is open. wait for order to be executed
when order is executed and shares are bought at ACTUAL_BUY_PRICE. 
place an order to sell at SELL_PRICE = limit + X (say X=7rs) amount based on profit
keep watching the MARKET_PRICE 
in case price falls say at BACKUP_PRICE = ACTUAL_BUY_PRICE - 10
Make an educated guess between:
1. Whether selling complete QTY at BACKUP_PRICE 
   and buying QTY at BACKUP_PRICE and selling at 
    BACKUP_PRICE +  { 0, ACTUAL_BUY_PRICE + ACTUAL_BREAK_EVEN, BACKUP_PRICE - 5,BACKUP_PRICE + 5}
2. Whether buying at BACKUP_PRICE QTY/2 and selling at
    BACKUP_PRICE +  { 0, ACTUAL_BUY_PRICE + ACTUAL_BREAK_EVEN, BACKUP_PRICE - 5,BACKUP_PRICE + 5}

which is benificial ? and do that . and place an order for
     BACKUP_SELL_PRICE =  ACTUAL_BUY_PRICE + ACTUAL_BREAK_EVEN

If MARKET_PRICE dosent hit the 


>>>>>>>> TODO
While in market watch if the MARKET_PRICE goes below 
ACTUAL_BUY_PRICE - 10 then check if the sell order is executed or not
if not executed then buy at BACKUP_PRICE the collateral
and set the NEW_SELL_PRICE = ACTUAL_BUY_PRICE + Min Break even
If this doesn't work then God Help Us ! Manual Intervention Needed !!!

*****************************/


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', 'reason:', reason.response ? reason.response.data.message : reason.message, reason.stack);
});

async function start(symbol) {

    console.log('========================')
    let loginData = await zlogin(Z_USERID, Z_PASSWORD, Z_PIN)
    enctoken = loginData.enctoken;
    kf_session = loginData.kf_session;
    public_token = loginData.public_token;
    console.log('Hello !', Z_USERID)
    console.log('Todays trade is', g(symbol))

    await adapter.init()

    // get last day data
    const currentMoment = moment().subtract(5, 'days').format('YYYY-MM-DD HH:mm');
    const endMoment = moment().subtract(0, 'days').format('YYYY-MM-DD HH:mm');
    let prevData = await adapter.getHistoricalData('n', 'c', symbol, '1m', currentMoment, endMoment)
    let lastDay = prevData[prevData.length - 1]
    console.log('Angel One flight test done lastPrice on', moment(lastDay.datetime).format('YYYY-MM-DD HH:mm'), 'was', lastDay.close)

    let marginAvailable = await getMargins();
    let balance = marginAvailable.available.live_balance;
    // let watchList = await getWatchlist('get', 'https://kite.zerodha.com/api/marketwatch')
    console.log('Zerodha flight test done. Avaialble margin', balance, 'Max spend', usablableBalance(balance).toFixed(2), 'Collateral', parseFloat(balance - usablableBalance(balance)).toFixed(2))


    // try to buy before 9:15
    async function waitTill(h, m) {
        console.log('Waiting till ', h, ":", m)
        while (1) {
            let curH = moment().get('hours');
            let curM = moment().get('m');
            if (curH == h && curM >= m || curH > h) {
                console.log('Starting trade ! Good Luck')
                return;
            }
            else {
                await delay(1000);
            }
        }
    }


    // await waitTill(START_HRS, START_MINS - 7)

    if (!(await shouldITradeToday(symbol))) {
        console.log(r('Kill Switch Active for morning. Not trading today'))
        return;
    }

    let initalPriceToday = await getInitialPrice(symbol)
    let lastPrice = initalPriceToday ?
        initalPriceToday.last_price
        //initalPriceToday.average_traded_price
        : lastDay.close;
    let LIMIT_BUY_PRICE = lastPrice + BUY_AT_MAX_FROM_PREV_DAY;
    console.log('\nLast trade for', symbol, 'was', initalPriceToday.last_price, 'on',
        c(moment(initalPriceToday.last_trade_time).format('YYYY-MM-DD HH:mm:ss')), 'so todays target buy @', g(LIMIT_BUY_PRICE))

    /******************/
    // LIMIT_BUY_PRICE = 1550;
    // FORCE_BUY = true;
    // FORCE_QTY= 1    
    // TARGET_PROF_PER_SHARE = 0.15;
    /******************/

    let alreadyBuyOrder = await checkIfAnyOrderIsPlacedAlready('BUY')
    let buyOrderResult;
    if (alreadyBuyOrder.ok) {
        buyOrderResult = alreadyBuyOrder;
    }
    else {
        buyOrderResult = await tryToPlaceLimitOrderBefore915(LIMIT_BUY_PRICE, symbol)
    }

    if (buyOrderResult.ok) {
        let buyOrderDetails = await waitTillOrderIsExecuted(buyOrderResult.order_id, 'BUY')
        console.log('Starting market watch of', symbol)
        let lastTick = { abs_change: 0, last_price: 0, change: 0, total_buy_quantity: 0, total_sell_quantity: 0 }
        startMarketWatch([symbol], (ticks) => {
            let tick = ticks[0]
            tick.abs_change = (tick.last_price - lastTick.last_price).toFixed(3)
            tick.change = ((tick.abs_change * 100) / lastTick.last_price).toFixed(3)
            tick.total_buy_quantity = tick.total_buy_quantity - lastTick.total_buy_quantity
            tick.total_sell_quantity = tick.total_sell_quantity - lastTick.total_sell_quantity

            lastTick = tick;
            let strip = `${c(moment(tick.last_trade_time).format('YYYY-MM-DD HH:mm:ss'))} | abs_change=${tick.abs_change < 0 ? r(tick.abs_change) : g(tick.change)} | change=${tick.change < 0 ? r(tick.change) : g(tick.change)} | last_price=${g(tick.last_price)} | sells ${tick.total_sell_quantity} | buys ${tick.total_buy_quantity}`
            console.log(strip)
        })
        if (buyOrderDetails.ok) {
            console.log('Order execution success with buy average_price', buyOrderDetails.average_price, 'x', buyOrderDetails.quantity)
            let sellOrderResult = await tryToPlaceSellOrder(buyOrderDetails)
            let sellOrderDetails = await waitTillOrderIsExecuted(sellOrderResult.order_id, 'SELL')

        }
        else {
            console.log('Order Cancelled . Restarting whole thing...' + buyOrderResult.order_id)
            return //start(symbol)
        }
    }



}

function shouldITradeToday(symbol) {
    if (FORCE_SKIP_OUTLOOK_CHECK)
        return true;

    return new Promise(async (resolve, reject) => {

        let asianMarketOutlook = await require('./asian_market_scrap')('asia')
        await startMarketWatch(undefined, (ticks, ticker) => {
            let gapUps = 0;
            let gapDowns = 0;
            let noChange = 0;

            let lastTrade = '';
            for (let i = 0; i < ticks.length; i++) {
                const tick = ticks[i];
                lastTrade = moment(tick.last_trade_time).format('YYYY-MM-DD HH:mm:ss')
                if (tick.change < 0) {
                    gapDowns++
                }
                else if (tick.change > 0) {
                    gapUps++
                }
                else {
                    noChange++;
                }
            }
            let verdictUp = gapUps > gapDowns || asianMarketOutlook;
            console.log('Should I Trade ? ', verdictUp, `(NSE ${gapUps > gapDowns} | Asia ${asianMarketOutlook})`, lastTrade, '| gapUps = ', gapUps, "| gapDowns = ", gapDowns, "| noChange = ", noChange)

            resolve(verdictUp)
            ticker.autoReconnect(false, 0, 1)
            ticker.disconnect()
        })

    })

    return true;
}

async function cancelOrder(orderId) {

}


async function tryToPlaceLimitOrderBefore915(LIMIT_BUY_PRICE, symbol) {

    let marginAvailable = await getMargins();
    let balance = marginAvailable.available.live_balance;
    let toSpend = usablableBalance(balance);
    return new Promise(async (res, rej) => {
        async function callMyself() {
            await delay(500)
            let curH = moment().get('hours');
            let curM = moment().get('m');
            if (FORCE_BUY || curH == START_HRS && curM < START_MINS) {
                let marginForOneQty = await zerodhaRequiredMargin(LIMIT_BUY_PRICE, 1, 'BUY', symbol);
                if (!marginForOneQty) {
                    return callMyself()
                }
                let qty = FORCE_QTY || Math.floor(toSpend / marginForOneQty.total)
                let requiredMargin = await zerodhaRequiredMargin(LIMIT_BUY_PRICE, qty, 'BUY', symbol);

                let targetSell = LIMIT_BUY_PRICE + TARGET_PROF_PER_SHARE;
                let brokerage = calculator(LIMIT_BUY_PRICE, targetSell, qty, true)
                let brokerageMin = calculator(LIMIT_BUY_PRICE, LIMIT_BUY_PRICE, qty, true)

                let brokerageInfo = `[Total Charges ${brokerage.total_tax} Min Breakeven +${brokerage.breakeven} Target Profit ${brokerage.net_profit}]`

                console.log('Trying to place a buy order before market opens @', LIMIT_BUY_PRICE, 'x', qty, 'requiredMargin', requiredMargin ? requiredMargin.total : `[${qty * marginForOneQty.total}]`, brokerageInfo)

                let orderPlaceResult = await tryToPlaceOrderZerodha(LIMIT_BUY_PRICE, qty, 'BUY', symbol, 'LIMIT')
                if (orderPlaceResult.ok) {
                    let placed = await waitTillOrderIsOpen(orderPlaceResult.order_id, 'BUY')
                    if (placed == 1) {
                        console.log('-------------ORDER PLACED----------', orderPlaceResult)
                        res(orderPlaceResult)
                    }
                    else {
                        callMyself();
                    }
                }
                else
                    callMyself();
            }
            else {
                console.log('')
                res({
                    ok: false
                })
            }
        }
        callMyself()
    })

}

async function tryToPlaceSellOrder(actualOrder) {

    return new Promise(async (resolve, reject) => {

        let qty = actualOrder.quantity;
        let symbol = actualOrder.tradingsymbol
        let targetSell = (actualOrder.average_price + TARGET_PROF_PER_SHARE).toFixed(2);
        let brokerage = calculator(actualOrder.average_price, targetSell, qty, true)
        let brokerageInfo = `[Total Charges ${brokerage.total_tax} Min Breakeven +${brokerage.breakeven} Target Profit ${brokerage.net_profit}]`

        async function callMyself() {
            await delay(500)
            console.log('Placing sell order @', actualOrder.average_price, '-->', targetSell, 'x', actualOrder.quantity, brokerageInfo)
            let orderPlaceResult = await tryToPlaceOrderZerodha(targetSell, qty, 'SELL', symbol, 'LIMIT')
            if (orderPlaceResult.ok) {
                let placed = await waitTillOrderIsOpen(orderPlaceResult.order_id, 'SELL')
                if (placed == 1) {
                    console.log('-------------SELL ORDER PLACED---------- target @', targetSell, orderPlaceResult)
                    resolve(orderPlaceResult)
                }
                else {
                    callMyself();
                }
            }
            else
                callMyself();

        }

        callMyself();
    })
}


/**
 * 
 * @param {*} limitPrice 
 * @param {*} qty 
 * @param {*} type BUY or SELL
 * @param {*} symbol 
 * @returns 
 */
async function tryToPlaceOrderZerodha(limitPrice, qty, type, symbol, order_type) {
    var data = `variety=regular&exchange=NSE&tradingsymbol=${symbol}&transaction_type=${type}&order_type=${order_type}&quantity=${qty}&price=${limitPrice}&product=${trade}&validity=DAY&disclosed_quantity=0&trigger_price=0&squareoff=0&stoploss=0&trailing_stoploss=0&user_id=${Z_USERID}`

    try {

        let result = await zerodhaCall('post', 'https://kite.zerodha.com/oms/orders/regular', data);
        result.ok = true;
        return result;
    } catch (e) {
        console.log('Couldnt place order >>', e.response.data.message)
        return {
            message: e.response.data.message,
            ok: false
        }
    }
}

async function getMargins() {

    let marginData = await zerodhaCall('get', "https://kite.zerodha.com/oms/user/margins")
    return marginData.equity;
}


async function zerodhaCall(method, url, data) {
    var config = {
        method: method,
        url: url,
        headers: {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "authorization": `enctoken ${enctoken}`,
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-kite-userid": "AMC939",
            "x-kite-version": "2.9.10",
            "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
            "Referer": "https://kite.zerodha.com/dashboard",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "x-csrftoken": public_token
        },
        data: data
    };

    try {
        let result = await axios(config);
        return result.data.data;

    } catch (e) {
        // console.log('Zerodha ERROR', e.response.data.message)
        throw e;
    }
}

async function zerodhaRequiredMargin(limitPrice, qty, type, symbol) {

    return new Promise((resolve, reject) => {

        fetch("https://kite.zerodha.com/oms/margins/orders", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "authorization": "enctoken " + enctoken,
                "content-type": "application/json",
                "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-kite-version": "2.9.10"
            },
            "referrer": "https://kite.zerodha.com/dashboard",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": `[{\"exchange\":\"NSE\",\"tradingsymbol\":\"${symbol}\",\"transaction_type\":\"${type}\",\"variety\":\"regular\",\"product\":\"${trade}\",\"order_type\":\"LIMIT\",\"quantity\":${qty},\"price\":${limitPrice}}]`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        })
            .then(res => res.json())
            .then(json => {
                resolve(json.data[0])
            })
            .catch(err => {
                reject(err)
            });
    })

}

function wrap(fetchPromise) {
    return new Promise((resolve, reject) => {
        fetchPromise
            .then(res => res.json())
            .then(json => {
                if (!json.data) {
                    return resolve(json)
                }
                resolve(json.data)
            })
            .catch(err => {
                reject(err)
            });
    })
}

async function getHistoricalData(tickerId) {
    return wrap(fetch("https://kite.zerodha.com/oms/instruments/historical/5582849/day?user_id=AMC939&oi=1&from=2021-01-10&to=2022-01-05", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "authorization": "enctoken oSo7qevue4IYCoRWJzI5V2FZ5zw9gIPFz0gM+PenQsWs1sVrBwTllY/xZlBkjq+3rgoUiZ6l76gd7vGI8cDc65+Yj6fLzBpwcYwQgCjeKnbWrjmLcivH/A==",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://kite.zerodha.com/chart/web/tvc/NSE/SBILIFE/5582849",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    }))
}

async function getWatchlist() {
    let result = await wrap(fetch("https://kite.zerodha.com/api/marketwatch", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "if-none-match": "W/\"058v4pAh85m94R2Y\"",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-csrftoken": public_token,
            "x-kite-version": "2.9.10",
            "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
            "Referer": "https://kite.zerodha.com/marketwatch",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    }))
    let body = result[0];
    return body.items;
}

async function waitTillOrderIsOpen(orderId, type) {
    console.log('Waiting for order', type, orderId, 'to reach OPEN or REJECTED state')

    return new Promise(async (resolve, reject) => {

        async function callMyself() {
            let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "authorization": "enctoken " + enctoken,
                    "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                    "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-kite-version": "2.9.10"
                },
                "referrer": "https://kite.zerodha.com/orders",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            }))

            for (let index = 0; index < orders.length; index++) {
                const order = orders[index];
                if (order.order_id == orderId) {
                    if (order.status == "OPEN" || order.status == "COMPLETE") {
                        console.log('Order', orderId, 'is now OPEN. @', order.average_price || order.price)
                        resolve(1)
                    }
                    else if (order.status == "REJECTED" || order.status == "CANCELLED") {
                        console.log('Order', orderId, 'rejected.', order.status_message)
                        resolve(-1)
                    }
                    else {
                        await delay(500)
                        callMyself()
                    }
                }
            }
        }
        callMyself()
    })
}

async function waitTillOrderIsExecuted(orderId, type) {
    console.log('Waiting for order', type, orderId, 'to reach COMPLETE | CANCELLED state')

    return new Promise(async (resolve, reject) => {

        async function callMyself() {
            let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "authorization": "enctoken " + enctoken,
                    "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                    "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-kite-version": "2.9.10"
                },
                "referrer": "https://kite.zerodha.com/orders",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            }))

            for (let index = 0; index < orders.length; index++) {
                const order = orders[index];
                if (order.order_id == orderId) {
                    if (order.status == "COMPLETE") {
                        console.log('Order', orderId, 'is now COMPLETE. actual average_price @', order.average_price)
                        order.ok = true;
                        resolve(order)
                    }
                    else if (order.status == "CANCELLED") {
                        console.log('Order', orderId, 'rejected.', order.status_message)
                        order.ok = false;
                        resolve(order)
                    }
                    else {
                        await delay(500)
                        callMyself()
                    }
                }
            }
        }
        callMyself()
    })
}


async function checkIfAnyOrderIsPlacedAlready(type) {
    console.log('Waiting for an order', type, 'to reach OPEN | COMPLETE state')

    return new Promise(async (resolve, reject) => {

        async function callMyself() {
            let orders = await wrap(fetch("https://kite.zerodha.com/oms/orders", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                    "authorization": "enctoken " + enctoken,
                    "if-none-match": "W/\"5tkudQ119aB023AJ\"",
                    "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-kite-version": "2.9.10"
                },
                "referrer": "https://kite.zerodha.com/orders",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            }))

            for (let index = 0; index < orders.length; index++) {
                const order = orders[index];
                if (order.transaction_type == type && order.status == "COMPLETE" || order.status == "OPEN") {
                    console.log('Order', order.order_id, 'is now COMPLETE|OPEN. actual average_price @', order.average_price)
                    order.ok = true;
                    resolve(order)
                }
            }
            resolve({ ok: false })
        }
        callMyself()
    })
}

async function getInitialPrice(symbol) {
    return new Promise(async (resolve, reject) => {


        await startMarketWatch([symbol], (ticks, ticker) => {
            let tick = ticks[0]
            resolve(tick)
            ticker.autoReconnect(false, 0, 1)
            ticker.disconnect()
        })

    })
}
async function startMarketWatch(symbols, onTick) {

    // console.log('Starting market watch of', symbols)
    let watchList = await getWatchlist()
    if (!watchList) {
        return console.log('Fatal failure while retrieving watchlist')
    }

    let instrument_tokens = [];
    for (let index = 0; index < watchList.length; index++) {
        const element = watchList[index];
        if (symbols) {

            for (let j = 0; j < symbols.length; j++) {
                const symbol = symbols[j];
                if (element.tradingsymbol == symbol) {
                    instrument_tokens.push(element.instrument_token)
                    break;
                }
            }
        }
        else {
            instrument_tokens.push(element.instrument_token)
        }
    }

    if (instrument_tokens.length == 0) {
        console.log('Fatal ! none of', symbols, 'is present in your zerodha watchlist 1 . Please Add')
    }

    let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURIComponent(enctoken)}&uid=${(new Date().getTime().toString())}&user-agent=kite3-web&version=2.9.10`

    let ticker = new KiteTicker(({
        root: wsUrl
    }));

    ticker.connect();
    ticker.on("ticks", onTicks);
    ticker.on("connect", subscribe);
    function onTicks(ticks) {
        if (onTick) {
            onTick(ticks, ticker)
        }
    }
    function subscribe() {
        var items = instrument_tokens;
        ticker.subscribe(items);
        ticker.setMode(ticker.modeFull, items);
    }

    return ticker;

}




start(stock)

