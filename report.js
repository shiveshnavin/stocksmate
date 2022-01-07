const fetch = require('node-fetch');
let moment = require('moment')
let Tick = require('./dao/tick')
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
////////////////////////////
let enctoken = '/5yidvI2GWMwI3nnLy7355BTnsBumsgNSUfJGxpc5yowwu4B0nMgN3ZKwjjWKlZHd8Dg+Gb853eqyCR2n2uQlDuvvIh+5Bb++WC4nCFd3FUDhaEchgMJaw=='
let symbol = "SBILIFE"
let tokens = require('./adapters/zerodha/scrip.json')
////////////////////////////

let data = [{
    open: 0,
    high: 0,
    high_time: 0,
    low: 0,
    low_time: 0,
    close: 0
}]
function getInstrumentBySymbol(symbol) {
    for (let index = 0; index < tokens.length; index++) {
        const element = tokens[index];
        if (element.tradingsymbol == symbol) {
            return element.instrument_token
        }
    }
}
/**
 * 
 * @param {*} symbol 
 * @param {*} from 
 * @param {*} to 
 * @param {*} interval https://kite.trade/docs/connect/v3/historical/
 */
async function getDataByDay(symbol, from, to, interval) {

    let from_date = moment(from).format('yyyy-MM-DD HH:mm:ss')
    let to_date = moment(to).format('yyyy-MM-DD HH:mm:ss')
    if (from_date == to_date) {
        to_date = moment(to).add(23, "hours").format('yyyy-MM-DD HH:mm:ss')
    }

    let url = `https://kite.zerodha.com/oms/instruments/historical/${getInstrumentBySymbol(symbol)}/${interval}?user_id=AMC939&oi=1&from=${encodeURIComponent(from_date)}&to=${encodeURIComponent(to_date)}`;
    let result = await wrap(fetch(
        url, {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
            "authorization": "enctoken " + enctoken,
            "sec-ch-ua": "\"(Not(A:Brand\";v=\"8\", \"Chromium\";v=\"100\", \"Google Chrome\";v=\"100\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "cookie": "_ga=GA1.2.494953855.1641359787; _gid=GA1.2.397832564.1641359787; kf_session=GtrI359QORoZipNW7lIZgmASEIFA3z7p; user_id=AMC939; public_token=S9zrVZIsogam8gCFlD5CWQraS11XQbpk; enctoken=/5yidvI2GWMwI3nnLy7355BTnsBumsgNSUfJGxpc5yowwu4B0nMgN3ZKwjjWKlZHd8Dg+Gb853eqyCR2n2uQlDuvvIh+5Bb++WC4nCFd3FUDhaEchgMJaw==",
            "Referer": "https://kite.zerodha.com/chart/web/tvc/NSE/SBILIFE/5582849",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": null,
        "method": "GET"
    }))


    return result.candles;
}

async function getDaySummary(date) {

    let candlesOnDate = await getDataByDay(symbol, date, date, 'minute')
    if (candlesOnDate && candlesOnDate.length > 0) {

        // console.log('Retrieved', candlesOnDate.length, 'data points')
        let todaySummary = {
            date: date,
            open: 0,
            open_time: 0,
            change: 0,
            high: 0,
            high_time: 0,
            low: 999999990,
            low_time: 0,
            close: 0,
            close_time: 0,
            datapoints: candlesOnDate.length
        };

        let ticks = []
        if (candlesOnDate) {
            candlesOnDate.forEach(element => {
                // [timestamp, open, high, low, close, volume]
                let tk = new Tick({
                    symbol: symbol,
                    close: element[4],
                    datetime: element[0],
                    high: element[2],
                    low: element[3],
                    open: element[1],
                    volume: element[5],
                });

                if (tk.datetime > date) {

                    ticks.push(tk)
                    if (!todaySummary.open) {
                        todaySummary.open = tk.open
                        todaySummary.open_time = moment(tk.datetime).format("HH:mm");

                    }

                    if (todaySummary.high < tk.high) {
                        todaySummary.high = tk.high;
                        todaySummary.high_time = moment(tk.datetime).format("HH:mm");
                    }
                    if (todaySummary.low > tk.low) {
                        todaySummary.low = tk.low;
                        todaySummary.low_time = moment(tk.datetime).format("HH:mm");
                    }
                    todaySummary.close = tk.close
                    todaySummary.close_time = moment(tk.datetime).format("HH:mm");

                }

            });

            return todaySummary;
        }


    }

}

async function start() {

    let summaries = []
    console.log('Summarized', symbol)

    const currentMoment = moment().subtract(30, 'days');
    const endMoment = moment().add(1, 'days')
    while (currentMoment.isBefore(endMoment, 'day')) {
        let cur = currentMoment.format('YYYY-MM-DD');
        currentMoment.add(1, 'days');
        let sum = await getDaySummary(cur)
        if (sum) {
            sum.change = (sum.close - sum.open).toFixed(2)
            summaries.push(sum)
        }
    }
    console.table(summaries)
}
start()