const Stratergy = require('./stratergy')
const brokerage = require('../brokerage')
class TimeBasedStratergy extends Stratergy {


    type = "intra"
    morningBuyDone = false;
    morningSellDone = false;
    minimumBreakEvenPrice;
    targetProfitPerCycle = 500;
    targetPrice;
    profit = 0;

    high = { close: 0 };
    low = { close: 9999999 };
    async evaluate(tick) {

        if (tick.close > this.high.close) {
            this.high = tick;
        }
        if (tick.close < this.low.close) {
            this.low = tick;
        }
        let brokerageCalc;
        if (this.type == 'intra') {
            brokerageCalc = brokerage.cal_intra
        }
        else {
            brokerageCalc = brokerage.cal_delivery
        }

        let date = new Date(tick.datetime)
        let hours = date.getHours();
        let mins = date.getMinutes();
        // ;//console.log(hours, ":", mins, tick.close)

        if (!this.morningBuyDone) {

            if (hours < 10 && hours >= 9) {
                if (mins > 17) {
                    let availableMargin = await this.adapter.getAvailableMargin();
                    if (availableMargin > tick.close) {
                        let canSpend = availableMargin / 2;
                        let price = tick.close;
                        let qty = Math.ceil(canSpend / price);
                        if (qty > 0) {
                            this.adapter.buy(tick, qty, price)
                            this.morningBuyDone = true;
                            let minBrokerage = brokerageCalc(price, price, qty, true)
                            this.minimumBreakEvenPrice = (price + minBrokerage.breakeven).toFixed(2);

                            let initialTargetPrice = this.targetProfitPerCycle / qty + price;
                            let targetBrokerage = brokerageCalc(price, initialTargetPrice, qty).total_tax

                            let revisedTargetPerCycle = this.targetProfitPerCycle + targetBrokerage;
                            this.targetPrice = revisedTargetPerCycle / qty + price;
                            let finalBrokerage = brokerageCalc(price, this.targetPrice, qty).total_tax
                                ;//console.log('Buy@', price, 'Target sell @', this.targetPrice, 'target brokerage', finalBrokerage, 'and desperate minimum sell @', parseFloat(this.minimumBreakEvenPrice))
                            ;//console.log('------------------', hours, ':', mins, '---------------', tick.close, '--------------')

                        }

                    }
                }
            }
        }

        if (this.morningBuyDone) {
            let position = await this.adapter.getPosition(tick.symbol)

            if (tick.close >= this.targetPrice || (hours >= 14 && tick.close >= this.minimumBreakEvenPrice) || hours >= 15) {

                let reason = ""
                if (position > 0) {
                    if (tick.close >= this.targetPrice)
                        reason = ('Selling ' + position + ' since curprice ' + tick.close + ' > target ' + this.targetPrice)
                    else if ((hours >= 2 && tick.close >= this.minimumBreakEvenPrice))
                        reason = ('Selling at bare minimum ' + this.minimumBreakEvenPrice + ' since its 2PM ')
                    else if (hours >= 3)
                        reason = ('Selling since its 3 PM !! @ ' + tick.close)


                    let trades = await this.adapter.getTrades(tick.symbol)
                    for (let index = 0; index < trades.length; index++) {
                        const trade = trades[index];
                        if (trade.isBuy) {
                            let qty = trade.qty;
                            let sp = tick.close;
                            let bp = trade.price;
                            this.adapter.sell(tick, qty, sp);
                            let profit = qty * (sp - bp) - brokerageCalc(bp, sp, qty).total_tax
                            this.profit = (this.profit + profit).toFixed(2)
                            console.log('Target', this.targetPrice.toFixed(2), `[${this.high.close},${this.low.close}]`, 'but Selling ', bp, '->', sp, 'with profit after brokerage', profit.toFixed(2), ' >> ', reason)
                        }
                        this.morningSellDone = true;
                    }
                    ;//console.log('------------------', hours, ':', mins, '---------------', tick.close, '--------------')
                    ;//console.log('******************HIGH', this.high.close, '******************LOW', this.low.close, '******************')

                }

            }
        }

    }

    execute(tick) {

    }

    result() {

    }

}

module.exports = TimeBasedStratergy