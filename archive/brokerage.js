
function cal_intra(bp, sp, qty, isNse = true) {

    if (isNaN(bp) || bp == 0) {
        bp = 0;
        bse_tran_charge_buy = 0;
    }
    if (isNaN(sp) || sp == 0) {
        sp = 0;
        bse_tran_charge_sell = 0;
    }
    var brokerage_buy = ((bp * qty * 0.0003) > 20) ? 20 : parseFloat(parseFloat(bp * qty * 0.0003).toFixed(2));
    var brokerage_sell = ((sp * qty * 0.0003) > 20) ? 20 : parseFloat(parseFloat(sp * qty * 0.0003).toFixed(2));
    var brokerage = parseFloat(parseFloat(brokerage_buy + brokerage_sell).toFixed(2));

    var turnover = parseFloat(parseFloat((bp + sp) * qty).toFixed(2));

    var stt_total = Math.round(parseFloat(parseFloat((sp * qty) * 0.00025).toFixed(2)));

    var exc_trans_charge = (isNse) ? parseFloat(parseFloat(0.0000345 * turnover).toFixed(2)) : parseFloat(parseFloat(0.0000345 * turnover).toFixed(2));
    var cc = 0;

    var stax = parseFloat(parseFloat(0.18 * (brokerage + exc_trans_charge)).toFixed(2));

    var sebi_charges = parseFloat(parseFloat(turnover * 0.000001).toFixed(2));

    var stamp_charges = parseFloat(parseFloat((bp * qty) * 0.00003).toFixed(2));

    var total_tax = parseFloat(parseFloat(brokerage + stt_total + exc_trans_charge + cc + stax + sebi_charges + stamp_charges).toFixed(2));

    var breakeven = parseFloat(parseFloat(total_tax / qty).toFixed(2));
    breakeven = isNaN(breakeven) ? 0 : breakeven

    var net_profit = parseFloat(parseFloat(((sp - bp) * qty) - total_tax).toFixed(2));

    return {
        turnover: turnover,
        brokerage: brokerage,
        stt_total: stt_total,
        exg_trans_charge: exc_trans_charge,
        clearing_charge: cc,
        gst: stax,
        sebi_charges: sebi_charges,
        stamp_charges: stamp_charges,
        total_tax: total_tax,
        breakeven: breakeven,
        net_profit: net_profit,
    }
}

function cal_delivery(bp, sp, qty, isNse = true) {

    if (isNaN(bp) || bp == 0) {
        bp = 0;
        bse_tran_charge_buy = 0;
    }
    if (isNaN(sp) || sp == 0) {
        sp = 0;
        bse_tran_charge_sell = 0;
    }

    var turnover = parseFloat(parseFloat((bp + sp) * qty).toFixed(2));

    var brokerage = 0;

    var stt_total = Math.round(parseFloat(parseFloat(turnover * 0.001).toFixed(2)));

    var exc_trans_charge = (isNse) ? parseFloat(parseFloat(0.0000345 * turnover).toFixed(2)) : parseFloat(parseFloat(0.0000345 * turnover).toFixed(2));
    var cc = 0;

    var stax = parseFloat(parseFloat(0.18 * (brokerage + exc_trans_charge)).toFixed(2));

    var sebi_charges = parseFloat(parseFloat(turnover * 0.000001).toFixed(2));

    var stamp_charges = parseFloat(parseFloat(bp * qty * 0.00015).toFixed(2));

    var total_tax = parseFloat(parseFloat(brokerage + stt_total + exc_trans_charge + cc + stax + sebi_charges + stamp_charges).toFixed(2));

    var breakeven = parseFloat(parseFloat(total_tax / qty).toFixed(2));
    breakeven = isNaN(breakeven) ? 0 : breakeven

    var net_profit = parseFloat(parseFloat(((sp - bp) * qty) - total_tax).toFixed(2));


    return {
        turnover: turnover,
        brokerage: brokerage,
        stt_total: stt_total,
        exg_trans_charge: exc_trans_charge,
        clearing_charge: cc,
        gst: stax,
        sebi_charges: sebi_charges,
        stamp_charges: stamp_charges,
        total_tax: total_tax,
        breakeven: breakeven,
        net_profit: net_profit,
    }
}


function cal_options(bp, sp, qty, isNse = true){
 
    var brokerage = 40;

    if (isNaN(bp) || bp == 0) {
        bp = 0;
        bse_tran_charge_buy = 0;
        brokerage = 20;
    }
    if (isNaN(sp) || sp == 0) {
        sp = 0;
        bse_tran_charge_sell = 0;
        brokerage = 20;
    }

    var turnover = parseFloat(parseFloat((bp+sp)*qty).toFixed(2));

    var stt_total = Math.round(parseFloat(parseFloat(sp * qty * 0.0005).toFixed(2)));

    var etc = (isNse) ? parseFloat(parseFloat(0.00053*turnover).toFixed(2)):0;

    var stax = parseFloat(parseFloat(0.18 * (brokerage + etc)).toFixed(2));

    var sebi_charges = parseFloat(parseFloat(turnover*0.000001).toFixed(2));

    var stamp_charges = parseFloat(parseFloat(bp*qty*0.00003).toFixed(2));

    var total_tax = parseFloat(parseFloat(brokerage + stt_total + etc + stax + sebi_charges + stamp_charges).toFixed(2));

    var breakeven = parseFloat(parseFloat(total_tax / qty).toFixed(2));
    breakeven = isNaN(breakeven) ? 0 : breakeven

    var net_profit = parseFloat(parseFloat(((sp - bp) * qty) - total_tax).toFixed(2));

    document.querySelector("#opt_turn").innerHTML = turnover;
    document.querySelector("#opt_brokerage").innerHTML = brokerage;
    document.querySelector("#opt_stt").innerHTML = stt_total;
    document.querySelector("#opt_etc").innerHTML = etc;
    document.querySelector("#opt_st").innerHTML = stax;
    document.querySelector("#sebi_opt").innerHTML = sebi_charges;
    document.querySelector("#stamp_duty_opt").innerHTML = stamp_charges;
    document.querySelector("#opt_total").innerHTML = total_tax;
    document.querySelector("#opt_breakeven").innerHTML = breakeven;
    document.querySelector("#opt_pnl").innerHTML = net_profit;
    if (parseFloat(net_profit) > 0) {
        document.querySelector("#opt_pnl").classList.remove("neg")
        document.querySelector("#opt_pnl").classList.add("pos")
    } else {
        document.querySelector("#opt_pnl").classList.remove("pos")
        document.querySelector("#opt_pnl").classList.add("neg")
    }
}

module.exports = {
    cal_delivery: cal_delivery,
    cal_intra: cal_intra,
    cal_options:cal_options
}