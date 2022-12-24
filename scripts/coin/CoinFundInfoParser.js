const r = require('./coin_funds.json')
class CoinFundInfoParser {
    constructor() {
        (this.amcToIconIndex = {
            AXISMUTUALFUND_MF: 0,
            BARODAMUTUALFUND_MF: 1,
            BHARTIAXAMUTUALFUND_MF: 2,
            BirlaSunLifeMutualFund_MF: 3,
            BNPPARIBAS_MF: 4,
            SUNDARAMMUTUALFUND_MF: 5,
            CANARAROBECOMUTUALFUND_MF: 6,
            DSP_MF: 7,
            EDELWEISSMUTUALFUND_MF: 8,
            ESSELMUTUALFUND_MF: 9,
            FRANKLINTEMPLETON: 10,
            HDFCMutualFund_MF: 11,
            HSBCMUTUALFUND_MF: 12,
            ICICIPrudentialMutualFund_MF: 13,
            IDBIMUTUALFUND_MF: 14,
            IDFCMUTUALFUND_MF: 15,
            IIFLMUTUALFUND_MF: 16,
            INDIABULLSMUTUALFUND_MF: 17,
            INVESCOMUTUALFUND_MF: 18,
            "ITI MUTUAL FUND_MF": 19,
            "JM FINANCIAL MUTUAL FUND_MF": 20,
            KOTAKMAHINDRAMF: 21,
            "L&TMUTUALFUND_MF": 22,
            LICMUTUALFUND_MF: 23,
            "MAHINDRA MUTUAL FUND_MF": 24,
            MIRAEASSET: 25,
            MOTILALOSWAL_MF: 26,
            NipponIndiaMutualFund_MF: 27,
            PGIMINDIAMUTUALFUND_MF: 28,
            PPFAS_MF: 29,
            PRINCIPALMUTUALFUND_MF: 30,
            QUANTMUTUALFUND_MF: 31,
            QUANTUMMUTUALFUND_MF: 32,
            SBIMutualFund_MF: 33,
            SHRIRAMMUTUALFUND_MF: 34,
            TATAMutualFund_MF: 35,
            TAURUSMUTUALFUND_MF: 36,
            UNIONMUTUALFUND_MF: 37,
            UTIMUTUALFUND_MF: 38,
            YESMUTUALFUND_MF: 39,
            "-": 40,
        }),
            (this.schemeToIconIndex = { equity: 1, "index funds": 7, "fund of funds": 3, hybrid: 4, debt: 5, "solution oriented": 6, "-": 2 }),
            (this.amcToColor = {
                AXISMUTUALFUND_MF: "#B23665",
                BARODAMUTUALFUND_MF: "#F57132",
                BHARTIAXAMUTUALFUND_MF: "#0470BF",
                BirlaSunLifeMutualFund_MF: "#E68041",
                BNPPARIBAS_MF: "#14A563",
                SUNDARAMMUTUALFUND_MF: "#1A6FAD",
                CANARAROBECOMUTUALFUND_MF: "#0DB5D1",
                DSP_MF: "#1D9E85",
                EDELWEISSMUTUALFUND_MF: "#1D5BD6",
                ESSELMUTUALFUND_MF: "#4040AD",
                FRANKLINTEMPLETON: "#4F4F4F",
                HDFCMutualFund_MF: "#032374",
                HSBCMUTUALFUND_MF: "#A01231",
                ICICIPrudentialMutualFund_MF: "#A04B4B",
                IDBIMUTUALFUND_MF: "#048E7A",
                IDFCMUTUALFUND_MF: "#B690BC",
                IIFLMUTUALFUND_MF: "#5B5BA8",
                INDIABULLSMUTUALFUND_MF: "#297C2B",
                INVESCOMUTUALFUND_MF: "#1C439B",
                "ITI MUTUAL FUND_MF": "#A01231",
                "JM FINANCIAL MUTUAL FUND_MF": "#3A53BA",
                KOTAKMAHINDRAMF: "#9E1D1D",
                "L&TMUTUALFUND_MF": "#4AACE9",
                LICMUTUALFUND_MF: "#0588D1",
                "MAHINDRA MUTUAL FUND_MF": "#A01231",
                MIRAEASSET: "#318CBA",
                MOTILALOSWAL_MF: "#F2B143",
                NipponIndiaMutualFund_MF: "#A01231",
                PGIMINDIAMUTUALFUND_MF: "#2D598E",
                PPFAS_MF: "#3AAF72",
                PRINCIPALMUTUALFUND_MF: "#018AD4",
                QUANTMUTUALFUND_MF: "#4F4F4F",
                QUANTUMMUTUALFUND_MF: "#3578AF",
                SBIMutualFund_MF: "#287CE0",
                SHRIRAMMUTUALFUND_MF: "#B57564",
                TATAMutualFund_MF: "#3F82C4",
                TAURUSMUTUALFUND_MF: "#8C304C",
                UNIONMUTUALFUND_MF: "#075BA0",
                UTIMUTUALFUND_MF: "#CF5D3B",
                YESMUTUALFUND_MF: "#1EAAE0",
                "-": "#F8B815",
            }),
            (this.dividendTypeToIdcw = {
                "dividend annual payout": "IDCW Annual",
                "dividend semi annual payout": "IDCW Semi Annual",
                "dividend quarterly payout": "IDCW Quarterly",
                "dividend monthly payout": "IDCW Monthly",
                "dividend fortnightly payout": "IDCW Fortnightly",
                "dividend weekly payout": "IDCW Weekly",
                "dividend interim payout": "IDCW Interim",
                "dividend daily payout": "IDCW Daily",
                "dividend payout": "IDCW Payout",
                growth: "Growth",
                "dividend reinvest": "Dividend reinvest",
            }),
            (this.amcDetails = {}),
            (this.formattedAmcList = []),
            (this.searchItems = []),
            (this.items = []);
    }
    getInstruments() {
        let e = r.mf.instruments;
        return e;
    }
    getAmcDetails() {
        let e = r.mf.amc_details;
        return e;
    }
    stripPlanName(e) {
        return e.replace("  ", " ").replace(" - Direct Plan", "").replace(" - Regular Plan", "");
    }
    formatDividendTypeWithInterval(e, t) {
        if ("G" === e) return "growth";
        if ("P" === e) return "dividend " + (null === t ? "" : t.toLowerCase() + " ") + "payout";
        if ("R" === e) return "dividend reinvest";
        {
            let e = null === e ? "" : e.toLowerCase() + " ";
            return e;
        }
    }
    formatDividendTypeIntervalToIDCW(e) {
        return this.dividendTypeToIdcw[e];
    }
    formatDividentType(e) {
        let t = e,
            n = t[0].toUpperCase() + t.slice(1);
        return n;
    }
    fetchFileName(e, t) {
        let n = e.toLowerCase(),
            a = t,
            i = 0,
            l = 0;
        a in this.amcToIconIndex && (i = this.amcToIconIndex[a]), n in this.schemeToIconIndex && (l = this.schemeToIconIndex[n]);
        let o = 7 * i + l;
        return o < 10 && (o = "0" + o), `Coins_SVGs-${o}.svg`;
    }
    fundSearchInstrumentsData() {
        let e = this.getInstruments(),
            t = [];
        return (
            e.map((e) => {
                if ((0 !== e[3] || (1 !== e[3] && 1 === e[30])) && 0 !== e[16] && "R" !== e[10]) {
                    let n = {
                        tradingSymbol: e[0],
                        fund: this.stripPlanName(e[2]),
                        fundLowerCase: this.stripPlanName(e[2]).toLowerCase(),
                        fileNamePath: this.fetchFileName(e[14], e[1]),
                        formattedDividendType: this.formatDividentType(this.formatDividendTypeWithInterval(e[10], e[11])),
                        formattedDividendTypeToIDCW: this.formatDividendTypeIntervalToIDCW(this.formatDividendTypeWithInterval(e[10], e[11])),
                        scheme: e[14],
                        subScheme: e[15],
                        aum: 1e7 * e[31],
                        fundPrimaryDetail:
                            e[0].toLowerCase() +
                            " " +
                            this.stripPlanName(e[2]).toLowerCase() +
                            " " +
                            e[14].toLowerCase() +
                            " " +
                            e[15].toLowerCase() +
                            " " +
                            this.formatDividendTypeIntervalToIDCW(this.formatDividendTypeWithInterval(e[10], e[11])).toLowerCase(),
                    };
                    t.push(n);
                }
            }),
            (this.searchItems = t),
            t
        );
    }
    parseInstrumentsData() {
        let e = this.getInstruments(),
            t = [];
        return (
            e.map((e) => {
                let n = {
                    tradingSymbol: e[0],
                    amc: e[1],
                    fund: this.stripPlanName(e[2]),
                    fundLowerCase: this.stripPlanName(e[2]).toLowerCase(),
                    purchaseAllowed: 1 == e[3],
                    redemptionAllowed: 1 == e[4],
                    minPurchaseAmt: e[5],
                    purchaseAmtMulti: e[6],
                    minAdditionalPurchaseAmt: e[7],
                    minRedemptionQty: e[8],
                    redemptionQtyMulti: e[9],
                    dividendType: e[10],
                    formattedDividendType: this.formatDividentType(this.formatDividendTypeWithInterval(e[10], e[11])),
                    dividendInterval: e[11],
                    dividend: this.formatDividendTypeWithInterval(e[10], e[11]),
                    formattedDividendTypeToIDCW: this.formatDividendTypeIntervalToIDCW(this.formatDividendTypeWithInterval(e[10], e[11])),
                    lastDividendDate: e[12] || "",
                    lastDividendPercent: e[13] || 0,
                    scheme: e[14],
                    subScheme: e[15],
                    plan: 0 == e[16] ? "Regular" : "Direct",
                    settlementType: e[17],
                    lastPrice: e[18],
                    lastPriceDate: e[19],
                    changePercent: e[20],
                    launchDate: e[21],
                    exitLoad: "" + e[22],
                    exitLoadSlab: e[23],
                    expenseRatio: e[24],
                    oneYearPercent: e[25],
                    twoYearPercent: e[26],
                    threeYearPercent: e[27],
                    fourYearPercent: e[28],
                    fiveYearPercent: e[29],
                    amcSipFlag: 1 === e[30],
                    aum: 1e7 * e[31],
                    manager: e[32],
                    lockIn: e[33],
                    risk: e[34],
                    fileNamePath: this.fetchFileName(e[14], e[1]),
                    fundPrimaryDetail:
                        e[0].toLowerCase() + " " + this.stripPlanName(e[2]).toLowerCase() + " " + e[14].toLowerCase() + " " + e[15].toLowerCase() + " " + this.formatDividendTypeWithInterval(e[10], e[11]).toLowerCase(),
                };
                t.push(n);
            }),
            (this.items = t),
            t
        );
    }
    parseAmcDetails() {
        let e = this.getAmcDetails(),
            t = {};
        for (let n = 0; n < e.length; n++) t[e[n][0]] = e[n][1];
        return (this.amcDetails = t), t;
    }
    formatAmcDetails() {
        let e = this.getAmcDetails(),
            t = [];
        for (let n = 0; n < e.length; n++) {
            let a = {};
            (a.id = e[n][0]), (a.link = e[n][1]), (a.name = e[n][2]), t.push(a);
        }
        return (this.formattedAmcList = t), t;
    }
    getLockin(e) {
        return e.lockIn;
    }
    getFundName(e) {
        return e.fund;
    }
    getDividentType(e) {
        let t = e.dividend,
            n = t[0].toUpperCase() + t.slice(1);
        return n;
    }
    getDividentTypeToIDCW(e) {
        let t = e.dividend;
        return this.formatDividendTypeIntervalToIDCW(t);
    }
    getScheme(e) {
        let t = e.scheme,
            n = t[0].toUpperCase() + t.slice(1);
        return n;
    }
    getSubScheme(e) {
        let t = e.subScheme,
            n = t[0].toUpperCase() + t.slice(1);
        return n;
    }
    getMinimumPurchaseAmount(e) {
        return e.minPurchaseAmt;
    }
    getMinimumAdditionalPurchaseAmount(e) {
        return e.minAdditionalPurchaseAmt;
    }
    getSettlementType(e) {
        return e.settlementType;
    }
    getCurrentNav(e) {
        return e.lastPrice;
    }
    getPurchaseAmtMulti(e) {
        return e.purchaseAmtMulti;
    }
    getAum(e) {
        return e.aum;
    }
    getExpenseRatio(e) {
        return e.expenseRatio;
    }
    getFileName(e) {
        let t = e.scheme.toLowerCase(),
            n = e.amc,
            a = 0,
            i = 0;
        n in this.amcToIconIndex && (a = this.amcToIconIndex[n]), t in this.schemeToIconIndex && (i = this.schemeToIconIndex[t]);
        let l = 7 * a + i;
        return l < 10 && (l = "0" + l), `Coins_SVGs-${l}.svg`;
    }
}

module.exports = CoinFundInfoParser