// High Volume Low Price Skimming
const zerodha = require("../adapters/zerodha/zerodha");
const readOTPFrom2FA = require("../dao/readOTPFrom2FA");
require('dotenv').config()
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
}

async function start(userid, password, totpKey, isRetry) {

    if (!adapters[userid]) {
        initAdapter(userid, password, totpKey, isRetry)
    }
}


start(process.env.Z_USERID, process.env.Z_PASSWORD, process.env.Z_TOTP_KEY, false);