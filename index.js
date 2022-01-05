require('dotenv').config()
const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')
let stock = 'SBILIFE'
let SimpleTimeBasedStratergy = require('./stratergies/simpletimestratergy')


let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);


async function start(symbol) {

    // get last day data
    



    
}
start(stock)