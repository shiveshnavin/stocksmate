const { SQLiteDB } = require("multi-db-orm");

let CoinFundInfoParser = require('./CoinFundInfoParser')
let fs = require('fs');
const path = require("path");
const Parallel = require("./Parallel");

let coin = new CoinFundInfoParser();

let allCoinInstruments = coin.parseInstrumentsData()
let coinInstrumentSample = allCoinInstruments[0]
// console.log(allCoinInstruments.length)
// console.log(coinInstrumentSample)
// fs.writeFileSync('./coin_funds_instruments.json', JSON.stringify(val, undefined, 2))


let dbFile = path.join('coin.db')
const db = new SQLiteDB(dbFile);

// db.create('coin_instruments', coinInstrumentSample);
// (async () => {

//     await Parallel.run(allCoinInstruments, element => db.insert('coin_instruments', element))
//     console.log("dumped coin instruments to db")
// })()


let coinPledgeInstruments = require(path.join(__dirname, 'old_info', 'data.json'))
let coinPledgeInstrumentSample = coinPledgeInstruments[0]
db.create('coin_pledge', coinPledgeInstrumentSample);
(async () => {

    await Parallel.run(coinPledgeInstruments, element => db.insert('coin_pledge', element))
    console.log("dumped coin_pledge to db")
})()