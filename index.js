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

/***************CONFIG***************/
let Z_USERID = "AMC939"
let enctoken = "/5yidvI2GWMwI3nnLy7355BTnsBumsgNSUfJGxpc5yowwu4B0nMgN3ZKwjjWKlZHd8Dg+Gb853eqyCR2n2uQlDuvvIh+5Bb++WC4nCFd3FUDhaEchgMJaw=="
let usablableBalance = function (balance) {
    return balance;
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

    // get last day data
    const currentMoment = moment().subtract(5, 'days').format('YYYY-MM-DD');
    const endMoment = moment().subtract(0, 'days').format('YYYY-MM-DD');
    let prevData = await adapter.getHistoricalData('n', 'c', symbol, '1d', currentMoment, endMoment)
    let lastDay = prevData[prevData.length - 1]
    console.log('Angel One flight test done')

    let marginAvailable = await getMargins();
    let balance = marginAvailable.available.live_balance;
    // let watchList = await getWatchlist('get', 'https://kite.zerodha.com/api/marketwatch')
    console.log('Zerodha flight test done. Avaialble margin', balance, 'Max spend', usablableBalance(balance), 'Collateral', parseFloat(balance - usablableBalance(balance)).toFixed(2))

    let lastClose = lastDay.close;

    // try to buy before 9:15
    await tryToPlaceLimitOrderBefore915(1544.1, symbol)



}


async function tryToPlaceLimitOrderBefore915(limitPrice, symbol) {

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
                    let marginForOneQty = await zerodhaRequiredMargin(limitPrice, 1, 'BUY', symbol);
                    if (!marginForOneQty) {
                        return callMyself()
                    }
                    let qty = Math.floor(toSpend / marginForOneQty.total)
                    let requiredMargin = await zerodhaRequiredMargin(limitPrice, qty, 'BUY', symbol);

                    let targetSell = limitPrice + TARGET_PROF_PER_SHARE;
                    let brokerage = calculator(limitPrice, targetSell, qty, true)
                    let brokerageMin = calculator(limitPrice, limitPrice, qty, true)

                    let brokerageInfo = `[Total Charges ${brokerage.total_tax} Min Breakeven +${brokerage.breakeven} Target Profit ${brokerage.net_profit}]`

                    console.log('Trying to place a buy order before market opens @', limitPrice, 'x', qty, '=', requiredMargin ? requiredMargin.total : `[${qty * marginForOneQty.total}]`, brokerageInfo)

                    let orderPlaceResult = await tryToPlaceOrderZerodha(limitPrice, 31, 'BUY', symbol, 'LIMIT')
                    if (orderPlaceResult.ok) {
                        await waitTillOrderIsOpen(orderPlaceResult.order_id)
                        console.log('-------------ORDER PLACED----------', orderPlaceResult)
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
            "cookie": "_ga=GA1.2.494953855.1641359787; _gid=GA1.2.397832564.1641359787; _gat_gtag_UA_29026012_17=1; kf_session=tyDC85onLpIP7h5Wa2Xi0L0DwO7Ga0uH; user_id=AMC939; public_token=DtNYzYC8R2nTs364gnBEwR8ajtSvM3qh; enctoken=6nNxhB9ZF67S6KzjPVuYlq65dIDJhDyWNNCjE5mxvAhTtThOKkZF2Cv0HLewvPDkQC94s2H815QaZq0isnZXNG5NdC9/J816DZFnls6CC5CiD9GKgNYejg==",
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
    let fet = fetch("https://kite.zerodha.com/api/marketwatch", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "if-none-match": "W/\"OBI43Y4WV2KOoPln\"",
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-csrftoken": "DtNYzYC8R2nTs364gnBEwR8ajtSvM3qh",
            "x-kite-version": "2.9.10",
            "cookie": "_ga=GA1.2.494953855.1641359787; _gid=GA1.2.397832564.1641359787; kf_session=tyDC85onLpIP7h5Wa2Xi0L0DwO7Ga0uH; user_id=AMC939; public_token=DtNYzYC8R2nTs364gnBEwR8ajtSvM3qh; enctoken=6nNxhB9ZF67S6KzjPVuYlq65dIDJhDyWNNCjE5mxvAhTtThOKkZF2Cv0HLewvPDkQC94s2H815QaZq0isnZXNG5NdC9/J816DZFnls6CC5CiD9GKgNYejg==",
            "Referer": "https://kite.zerodha.com/chart/web/tvc/NSE/GOLDBEES/3693569",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    });
    let result = await fet;
    let body = fet.body();
    return body;
}

async function waitTillOrderIsOpen(orderId) {
    return new Promise(async (resolve, reject) => {
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
                    resolve(1)
                }
                else if (order.status == "REJECTED") {
                    console.log('Order', orderId, 'rejected.', order.status_message)
                    resolve(-1)
                }
                else {
                    resolve(0)
                }
            }
        }
    })
}

async function startMarketWatch() {
    let position = [{}]
    let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURI(enctoken)}&uid=1641444782679&user-agent=kite3-web&version=2.9.10`
    wsUrl= "wss://ws.zerodha.com/?api_key=kitefront&user_id=AMC939&enctoken=DSDW8Nh%2Bv8PNG15K9CpuAhEWpyysFHTx2%2Fj0VEAHc%2B37SAdgwzFM8amCgl0wiY08sUuoxHmTWcDAIdKlBnNQQK%2Bvq%2FGAvrzmfq%2F41hqkt%2BgFDroV4UPlqg%3D%3D&uid=1641444782679&user-agent=kite3-web&version=2.9.10"
    const WebSocket = require('ws');
    const headers = {
    };
    ws = new WebSocket(wsUrl, { headers });
    ws.binaryType = 'arraybuffer';
    ws.on('open', () => {
        console.log('connected', Date());
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




start(stock)
// startMarketWatch();