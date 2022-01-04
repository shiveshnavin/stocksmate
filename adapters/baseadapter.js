class BaseAdapter {

    client;
    name = 'Base';
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
}