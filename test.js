require('dotenv').config()
const zerodha = require("./adapters/zerodha/zerodha");
const readOTPFrom2FA = require("./dao/readOTPFrom2FA");
const Tick = require('./dao/tick')
const FireStoreDB = require('multi-db-orm').FireStoreDB
const fs = require('fs')

const creds = JSON.parse(fs.readFileSync('./credentials.json').toString())
const multiDb = new FireStoreDB(creds)
let db = multiDb.db;
let onLog = console.log

async function getPin(amcId, totpKey) {
    let key = amcId + "_2mfapin"
    // let pin = await readInputFromFirebase(key, undefined, db)
    let pin = await readOTPFrom2FA(totpKey)
    return pin;
}

let adapters = {

}

async function initAdapter(userid, password, totpKey, isRetry) {
    let adapter = zerodha({
        username: userid,
        password: password,
        totp_key: totpKey,
        getPin: getPin
    }, console.log)

    let existingLogin = await multiDb.getOne('stocksmate_logins', { id: userid })
    if (!existingLogin) {
        existingLogin = await adapter.init()
        await multiDb.insert('stocksmate_logins', existingLogin)
    }
    else {
        await adapter.init(existingLogin)
        onLog('Zerodha using cached credentials')
    }

    try {
        let data = await adapter.getProfile()
        onLog('Zerodha Connected to user', data.user_name)
    } catch (e) {
        onLog('Zerodha Error logging in...', !isRetry ? 'retrying' : '')
        await multiDb.delete('stocksmate_logins', { id: userid })
        if (!isRetry)
            start(userid, password, totpKey, true)
    }

    adapters[userid] = adapter
    return adapter;
}


////////////////////////////////////////////////////


const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})
let moment = require('moment')

let strike = parseInt(process.argv[3]) || 17800;
let range = parseInt(process.argv[4]) || 0;

async function startTest() {

    let adapter = await initAdapter(process.env.Z_USERID, process.env.Z_PASSWORD, process.env.Z_TOTP_KEY, false)

    let stockDataCE = adapter.findScrip({
        "name": "NIFTY",
        "expiry": "2022-02-24",
        "strike": "17500",
        "instrument_type": "CE",
        "segment": "NFO-OPT",
        "exchange": "NFO"
    })
    let stockDataPE = adapter.findScrip({
        "name": "NIFTY",
        "expiry": "2022-02-24",
        "strike": "17100",
        "instrument_type": "PE",
        "segment": "NFO-OPT",
        "exchange": "NFO"
    })


    console.log(stockDataPE)
    console.log(stockDataCE)

    let formatDate = 'YYYY-MM-DD+HH:mm:ss'
    let day = parseInt(process.argv[2]) || 20;
    let from = moment(`2022-01-${day}T09:15:00`)
    let to = moment(`2022-01-${day + 1}T15:30:00`)

}

startTest() 