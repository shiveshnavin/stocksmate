let { SmartAPI, WebSocket } = require("smartapi-javascript");

let smart_api = new SmartAPI({
    api_key: "3NnxKp3S"
});


// If user does not have valid access token and refresh token then use generateSession method 
smart_api.generateSession(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD)
    .then((data) => {
        return smart_api.getProfile();
    });
smart_api.setSessionExpiryHook(customSessionHook);

function customSessionHook() {
    console.log("User loggedout");

    // NEW AUTHENTICATION CAN TAKE PLACE HERE
}
class AngelOneAdapter {

    client;
    name = 'angelone';
    init() {
        console.log('Not Implemented BaseAdapter:init')
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
        console.log('Not Implemented BaseAdapter:fetchHistoricalData')
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