let moment = require('moment')
const fetch = require('node-fetch');
const zlogin = require('./login')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

var axios = require('axios');
let bCalc = require('../../archive/brokerage')
let KiteTicker = require('./ticker')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})


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
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};
let masterSymbolList = require('./scrips_full.json')

module.exports = function (config, log) {
    if (!log) {
        log = console.log
    }

    let mod = {};

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
    let TARGET_PROF_PER_SHARE = 20;
    let BUY_AT_MAX_FROM_PREV_DAY = 1;
    let SHORT_SELL_AT_MIN_FROM_PREV_DAY = 10;
    let FORCE_BUY = false;
    let FORCE_SELL = false;
    let FORCE_QTY = undefined;
    let FORCE_SKIP_OUTLOOK_CHECK = false;

    let calculator = trade == 'MIS' ? bCalc.cal_intra : bCalc.cal_delivery


    mod.init = async function () {
        log('========================')
        let loginData = await zlogin(Z_USERID, Z_PASSWORD, Z_PIN)
        enctoken = loginData.enctoken;
        kf_session = loginData.kf_session;
        public_token = loginData.public_token;
    }

    /**
     * 
     * @param {*} ticker {tradingsymbol OR name,"expiry":"2022-03-31","instrument_type":"CE",strike,"segment":"NFO-OPT","exchange":"NFO"}
     */
    mod.findScrip = function (ticker) {
        for (let j = 0; j < masterSymbolList.length; j++) {
            const symbol = masterSymbolList[j];
            if (ticker.tradingsymbol == symbol.tradingsymbol &&
                ticker.segment == symbol.segment &&
                ticker.exchange == symbol.exchange) {
                return symbol
            }
            else if (
                ticker.segment == symbol.segment &&
                ticker.instrument_type == symbol.instrument_type &&
                ticker.expiry == symbol.expiry &&
                ticker.strike == symbol.strike &&
                ticker.exchange == symbol.exchange
            ) {
                return symbol
            }
        }
    }


    mod.listen = async function (symbols, onTick) {

        // log('Starting market watch of', symbols)
        if (!masterSymbolList) {
            return log('Fatal failure while retrieving watchlist')
        }

        let instrument_tokens = [];
        for (let index = 0; index < masterSymbolList.length; index++) {
            const element = masterSymbolList[index];
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
            log('Fatal ! none of', symbols, 'is present in your zerodha watchlist 1 . Please Add')
        }

        let wsUrl = `wss://ws.zerodha.com/?api_key=kitefront&user_id=${Z_USERID}&enctoken=${encodeURIComponent(enctoken)}&uid=${(new Date().getTime().toString())}&user-agent=kite3-web&version=2.9.10`

        let ticker = new KiteTicker(({
            root: wsUrl
        }));

        ticker.connect();
        ticker.on("ticks", onTicks);
        ticker.on("connect", subscribe);
        function onTicks(ticks) {
            if (isKill) {
                ticker.autoReconnect(false, 0, 1)
                ticker.disconnect()
            }
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

    /**
     * 
     * @param {*} instrumentToken 
     * @param {*} interval minute · day · 3minute · 5minute · 10minute · 15minute · 30minute · 60minute
     * @param {*} from yyyy-mm-dd hh:mm:ss 2015-12-28+09:30:00
     * @param {*} to yyyy-mm-dd hh:mm:ss 2015-12-28+09:30:00
     * @returns 
     */
    mod.getHistoricalData = async function getHistoricalData(instrumentToken, interval, from, to, continuous) {
        
        return wrap(fetch(`https://kite.zerodha.com/oms/instruments/historical/${instrumentToken}/${interval}?user_id=AMC939&oi=1&continuous=${continuous ? 1 : 0}&from=${from}&to=${to}`, {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
                "authorization": "enctoken " + enctoken,
                "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "x-csrftoken": public_token,
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "cookie": `kf_session=${kf_session}; user_id=${Z_USERID}; enctoken=${enctoken}`,
            },
            "referrer": "https://kite.zerodha.com/chart/web/tvc/NSE/SBILIFE/5582849",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        }))
    }



    return mod;
}