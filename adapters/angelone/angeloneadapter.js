let { SmartAPI, WebSocket } = require("smartapi-javascript");







class AngelOneAdapter {

    client;
    name = 'angelone';
    smart_api = new SmartAPI({
        api_key: "U9IreNhv"
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