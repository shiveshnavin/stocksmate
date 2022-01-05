require('dotenv').config()
let moment = require('moment')
const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')
let stock = 'SBILIFE'
let SimpleTimeBasedStratergy = require('./stratergies/simpletimestratergy')


let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);


async function start(symbol) {

    await adapter.init()
    // get last day data
    const currentMoment = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const endMoment = moment().subtract(0, 'days').format('YYYY-MM-DD');
    let lastDay = await adapter.getHistoricalData('n','c',symbol,'1d',currentMoment,endMoment)
    console.log('Flight test done')



    
}
start(stock)