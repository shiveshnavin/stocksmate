let { SmartAPI, WebSocket } = require("smartapi-javascript");
let moment = require('moment')
const Tick = require('../../dao/tick')



var scrips = []
function getScrip(symbol) {
    if (scrips.length == 0) {
        scrips = require('./scrip.json')
    }
    for (let index = 0; index < scrips.length; index++) {
        const element = scrips[index];
        if (element.symbol.match(symbol)) {
            return element;
        }

    }

}




class AngelOneAdapter {

    client;
    name = 'angelone';
    smart_api = new SmartAPI({
        api_key: "BHQUxhE6"
    });
    ag_client_code;
    ag_password;
    constructor(ag_client_code, ag_password) {
        this.ag_client_code = ag_client_code;
        this.ag_password = ag_password;
    }

    async customSessionHook() {
        console.log("User loggedout. Authenticating again");
        await this.init()
    }

    async init() {
        this.smart_api.setSessionExpiryHook(this.customSessionHook);
        await this.smart_api.generateSession(this.ag_client_code, this.ag_password)
        let user = await this.smart_api.getProfile();
        console.log('Angel One Adapter initialized-', user.data.name)
    }

    interValMap = {
        "1m": "ONE_MINUTE",
        "3m": "THREE_MINUTE",
        "5m": "FIVE_MINUTE",
        "10m": "TEN_MINUTE",
        "15m": "FIFTEEN_MINUTE",
        "30m": "THIRTY_MINUTE",
        "60m": "ONE_HOUR",
        "1d": "ONE_DAY",
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
    async getHistoricalData(exchange, exchange_type, symbol, interval, from, to) {
        let from_date = moment(from).format('yyyy-MM-DD HH:mm')
        let to_date = moment(to).format('yyyy-MM-DD HH:mm')
        if (from_date == to_date) {
            to_date = moment(to).add(23, "hours").format('yyyy-MM-DD HH:mm')
        }

        try {
            let exg = exchange == "b" ? "BSE" : "NSE";
            let scrip = getScrip(symbol).token;
            let inter = this.interValMap[interval];
            let opts = {
                "exchange": exg,
                "symboltoken": scrip,
                "interval": inter,
                "fromdate": from_date,
                "todate": to_date
            };
            let data = await this.smart_api.getCandleData(opts)
            data = data.data;

            let ticks = []
            if (data) {
                data.forEach(element => {
                    ticks.push(new Tick({
                        symbol: symbol,
                        close: element[4],
                        datetime: element[0],
                        high: element[2],
                        low: element[3],
                        open: element[1],
                        volume: element[5],
                    }))
                });
            }
            else{
                console.log("No Data")
            }
            return ticks;
        } catch (e) {
            console.log(e)
        }
    }

    async getMarketFeed(exchange, exchange_type, symbol) {
        console.log('Not Implemented BaseAdapter:getMarketFeed')
    }

    async getPosition(symbol) {

    }

    async getTrades(symbol) {

    }

    async getAvailableMargin() {

    }
    async sell(tick, qty, price) {
        console.log('Buy', tick.symbol, '@', price, 'x', qty, 'Debit', qty * price)
    }

    async buy(tick, qty, price) {
        console.log('Buy', tick.symbol, '@', price, 'x', qty, 'Debit', qty * price)
    }
}

module.exports = AngelOneAdapter