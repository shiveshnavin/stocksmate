const conf = {
    "appSource": "8337",
    "appName": "5P52870689",
    "userId": "qbCTLQydONB",
    "password": "XItZYsuLI7j",
    "userKey": "IQkAD4Gki3g14AbNNgpiaGC3zsrCoSQg",
    "encryptionKey": "iF7ctDHTmQEKLQx5YV0yN5pZPmf8hvr4"
}
const { FivePaisaClient } = require("./fivepaisa_fork")
const moment = require('moment')
const Tick = require('../../dao/tick')

var scrips = []
function getScrip(symbol) {
    if (scrips.length == 0) {
        scrips = require('./scrip.json')
    }
    for (let index = 0; index < scrips.length; index++) {
        const element = scrips[index];
        if (element.Name.match(symbol)) {
            return element;
        }

    }

}

class FivePaisaAdapter {

    client;
    name = '5paisa';
    init(email, password, dob) {
        this.client = new FivePaisaClient(conf)
        return new Promise((res, rej) => {
            this.client.login(email, password, dob).then((response) => {
                this.client.init(response).then(() => {
                    res(this.client)
                })
            }).catch((err) => {
                rej(err)
            })
        })
    }

    /**
     * 
     * @param {*} exchange N – NSE B – BSE M – MCX (ExchType will be D) n – NCDEX (only if ExchType is X) 
     * @param {*} exchange_type c – Cash d – Derivative (Commodity if exchange is M) u – Currency Derivative x – NCDEX commodity y – Commodity 
     * @param {*} symbol 
     * @param {*} interval 1m 5m 10m 15m 30m 60m 1d
     * @param {*} from DD-MM-YYYY
     * @param {*} to DD-MM-YYYY
     */
    async fetchHistoricalData(exchange, exchange_type, symbol, interval, from, to) {
        let scrip = getScrip(symbol);

        const from_date = moment(from, 'DD-MM-YYYY').format('YYYY-MM-DD')
        const to_date = moment(to, 'DD-MM-YYYY').format('YYYY-MM-DD')

        let ticks = []
        if (scrip) {
            // https://www.5paisa.com/developerapi/historical-data
            let df = await this.client.historicalData(exchange, exchange_type, scrip.Scripcode, interval, from_date, to_date)
            df.data.forEach(element => {
                ticks.push(new Tick({
                    symbol: symbol,
                    close: element.Close,
                    datetime: element.Datetime,
                    high: element.High,
                    low: element.Low,
                    open: element.Open,
                    volume: element.Volume,
                }))
            });
        }
        return ticks;
    }


    async getMarketFeed(exchange, exchange_type, symbol) {
        let a = [
            {
                "Exch": exchange,
                "ExchType": exchange_type,
                "Symbol": symbol
            }]


        return await this.client.getMarketFeed(a)
    }

}

module.exports = FivePaisaAdapter;