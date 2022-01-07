require('dotenv').config()
let moment = require('moment')
const fetch = require('node-fetch');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')
let stock = 'HDFCBANK'
let SimpleTimeBasedStratergy = require('./stratergies/simpletimestratergy')
var axios = require('axios');
let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);
let bCalc = require('./brokerage')
let KiteTicker = require('./adapters/zerodha/ticker')

/***************CONFIG***************/
let Z_USERID = "AMC939"
let enctoken = "/5yidvI2GWMwI3nnLy7355BTnsBumsgNSUfJGxpc5yowwu4B0nMgN3ZKwjjWKlZHd8Dg+Gb853eqyCR2n2uQlDuvvIh+5Bb++WC4nCFd3FUDhaEchgMJaw=="
let kf_session = "GtrI359QORoZipNW7lIZgmASEIFA3z7p"
let usablableBalance = function (balance) {
    return balance * 0.45;
}
let usablableBackupBalance = function (balance) {
    return balance * 0.9;
}
let START_HRS = 9, START_MINS = 15;
let STOP_HRS = 15, STOP_MINS = 10

let trade = 'MIS'
let TARGET_PROF_PER_SHARE = 10;
let BUY_AT_MAX_FROM_PREV_DAY = 1;
let FORCE_BUY = false;
let FORCE_SELL = false;

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

*****************************/


process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', 'reason:', reason.response ? reason.response.data.message : reason.message, reason.stack);
});

async function start(symbol) {

    await adapter.init()

    console.log('Todays trade is', symbol)
    // get last day data
    const currentMoment = moment().subtract(5, 'days').format('YYYY-MM-DD HH:mm');
    const endMoment = moment().subtract(0, 'days').format('YYYY-MM-DD HH:mm');
    let prevData = await adapter.getHistoricalData('n', 'c', symbol, '1m', currentMoment, endMoment)
    let lastDay = prevData[prevData.length - 1]
    console.log('Angel One flight test done lastPrice on', moment(lastDay.datetime).format('YYYY-MM-DD HH:mm'), lastDay.close)

    let marginAvailable = await getMargins();
    let balance = marginAvailable.available.live_balance;
    // let watchList = await getWatchlist('get', 'https://kite.zerodha.com/api/marketwatch')
    console.log('Zerodha flight test done. Avaialble margin', balance, 'Max spend', usablableBalance(balance), 'Collateral', parseFloat(balance - usablableBalance(balance)).toFixed(2))

    let LIMIT_BUY_PRICE = lastDay.close + BUY_AT_MAX_FROM_PREV_DAY;

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
    await waitTill(START_HRS, 0)

    /******************/
    LIMIT_BUY_PRICE = 1386;
    FORCE_BUY = true;
    /******************/

    await tryToPlaceLimitOrderBefore915(LIMIT_BUY_PRICE, symbol)



}


async function tryToPlaceLimitOrderBefore915(LIMIT_BUY_PRICE, symbol) {

    let marginAvailable = await getMargins();
    let balance = marginAvailable.available.live_balance;
    let toSpend = usablableBalance(balance);
    return new Promise(async (res, rej) => {
        async function callMyself() {
            await delay(500)
            setTimeout(async () => {
                let curH = moment().get('hours');
                let curM = moment().get('m');
                if (FORCE_BUY || curH == START_HRS && curM < START_MINS) {
                    let marginForOneQty = await zerodhaRequiredMargin(LIMIT_BUY_PRICE, 1, 'BUY', symbol);
                    if (!marginForOneQty) {
                        return callMyself()
                    }
                    let qty = Math.floor(toSpend / marginForOneQty.total)
                    let requiredMargin = await zerodhaRequiredMargin(LIMIT_BUY_PRICE, qty, 'BUY', symbol);

                    let targetSell = LIMIT_BUY_PRICE + TARGET_PROF_PER_SHARE;
                    let brokerage = calculator(LIMIT_BUY_PRICE, targetSell, qty, true)
                    let brokerageMin = calculator(LIMIT_BUY_PRICE, LIMIT_BUY_PRICE, qty, true)

                    let brokerageInfo = `[Total Charges ${brokerage.total_tax} Min Breakeven +${brokerage.breakeven} Target Profit ${brokerage.net_profit}]`

                    console.log('Trying to place a buy order before market opens @', LIMIT_BUY_PRICE, 'x', qty, '=', requiredMargin ? requiredMargin.total : `[${qty * marginForOneQty.total}]`, brokerageInfo)

                    let orderPlaceResult = await tryToPlaceOrderZerodha(LIMIT_BUY_PRICE, 31, 'BUY', symbol, 'LIMIT')
                    if (orderPlaceResult.ok) {
                        let placed = await waitTillOrderIsOpen(orderPlaceResult.order_id)
                        if (placed == 1) {
                            console.log('-------------ORDER PLACED----------', orderPlaceResult)
                        }
                        else {
                            callMyself();
                        }
                    }
                    else
                        callMyself();
                }
                else {
                    res(false)
                }
            }, 500)
        }
        callMyself()
    })

}

async function tryToPlaceSellOrder(params) {
    let sell = await tryToPlaceOrderZerodha(targetSell, qty, 'SELL', symbol, 'LIMIT')
    if (sell.ok) {
        console.log('-------------SELL ORDER PLACED---------- target @', targetSell, sell)
        // startMarketWatch()
    }
    else {
        console.log('!!!!!! SELL ORDER NOT PLACED !!!!!! Please do manually, target @', targetSell)
    }
    res(orderPlaceResult)
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
            "x-csrftoken": "DtNYzYC8R2nTs364gnBEwR8ajtSvM3qh"
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
                resolve(json.data[0] || json.data)
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

async function getWatchlist(params) {
    let fet = await wrap(fetch("https://kite.zerodha.com/api/marketwatch", {
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
            "x-csrftoken": "S9zrVZIsogam8gCFlD5CWQraS11XQbpk",
            "x-kite-version": "2.9.10",
            "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
            "Referer": "https://kite.zerodha.com/marketwatch",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    }))
    let result = fet
    let body = result;
    return body;
}

async function waitTillOrderIsOpen(orderId) {
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
                    if (order.status == "OPEN") {
                        console.log('Order', orderId, 'is now OPEN.', order.status_message)
                        resolve(1)
                    }
                    else if (order.status == "REJECTED") {
                        console.log('Order', orderId, 'rejected.', order.status_message)
                        resolve(-1)
                    }
                    else {
                        console.log('Waiting for order', orderId, 'to reach terminal state')
                        await delay(500)
                        callMyself()
                    }
                }
            }
        }
        callMyself()
    })
}

async function startMarketWatch() {
    let position = [{}]
    let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURIComponent(enctoken)}&uid=1641444782679&user-agent=kite3-web&version=2.9.10`
    const WebSocket = require('ws');
    const headers = {
    };
    ws = new WebSocket(wsUrl, { headers });
    ws.binaryType = 'arraybuffer';
    ws.on('open', () => {
        console.log('connected', Date());
        var message = { "a": "subscribe", "v": [408065, 884737] };
        ws.send(JSON.stringify(message))
    });

    ws.on('message', function message(data) {
        console.log('received: %s', JSON.stringify(data));
    });
    ws.on('close', () => {
        console.log('disconnected', Date());
    });
    return;
    let net = position.net[0]
    console.log(net.tradingsymbol, 'x', net.quantity, net.pnl.toFixed(2))
    let curH = moment().get('hours');
    let curM = moment().get('m');
    if (FORCE_SELL || curH == STOP_HRS && curM > STOP_MINS) {
        if (net.quantity > 0) {
            // let exitAtClose = await tryToPlaceOrderZerodha(0, net.quantity, 'SELL', symbol, "MARKET")
            console.log('Exiting before market close', exitAtClose);
        }
    }

    await delay(2000)
    startMarketWatch()

}




// start(stock)
startMarketWatch();
// getWatchlist()