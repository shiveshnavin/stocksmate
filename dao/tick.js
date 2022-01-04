class Tick {
    symbol;
    datetime;
    high;
    low;
    open;
    close;
    volume;

    constructor(body) {
        this.symbol = body.symbol;
        this.datetime = body.datetime;
        this.high = body.high;
        this.low = body.low;
        this.open = body.open;
        this.close = body.close;
        this.volume = body.volume;
    }
}

module.exports = Tick;