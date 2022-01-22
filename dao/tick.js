class Tick {
    symbol;
    stockData;
    datetime;
    high;
    low;
    open;
    close;
    volume;
    oi;

    constructor(body) {
        this.symbol = body.symbol;
        this.datetime = body.datetime;
        this.high = parseFloat(body.high);
        this.low = parseFloat(body.low);
        this.open = parseFloat(body.open);
        this.close = parseFloat(body.close);
        this.volume = parseFloat(body.volume);
        this.oi = parseFloat(body.oi);
        this.stockData = body.stockData;
    }

    summary() {
        let copy = {};
        Object.assign(copy, this)
        copy.symbol = this.stockData.tradingsymbol;
        delete copy.stockData
        return copy;
    }
}

module.exports = Tick;