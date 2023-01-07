// High Volume Low Price Skimming
const zerodha = require("../adapters/zerodha/zerodha");
require('dotenv').config()

let adapter = zerodha({
    username: process.env.Z_USERID,
    password: process.env.Z_PASSWORD,
}, console.log)


async function start() {
    await adapter.init()
}


start();