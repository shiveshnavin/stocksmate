// High Volume Low Price Skimming

class HVLPSkimStratergy {

    adapter;
    constructor(userid, password, totpKey) {

    }
    init(adapter) {
        this.adapter = initAdapter(userid, password, totpKey, isRetry);
    }

    /**
     * 
     * @param {Tick} tick 
     */
    evaluate(tick) {

    }


    execute(tick) {

    }

    result() {

    }

}




module.exports = HVLPSkimStratergy