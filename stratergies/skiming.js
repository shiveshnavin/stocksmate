// High Volume Low Price Skimming

class HVLPSkimStratergy {

    adapter;
    onLog;
    constructor(adapter, onLog) {
        this.adapter = adapter
        this.onLog = onLog
        this.init(adapter)


    }
    init(adapter) {
    }

    /**
     * 
     * @param {Tick} tick 
     */
    evaluate(tick) {
        this.onLog('Evaluating tick', 'Price=', tick.close)
    }


    execute(tick) {

    }

    result() {

    }

}




module.exports = HVLPSkimStratergy