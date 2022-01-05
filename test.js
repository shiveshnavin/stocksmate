function testBrokerage() {
    let brok = require('./brokerage')
    console.log('Intraday', brok.cal_intra(1000, 1100, 10, true))
    console.log('Delivery', brok.cal_delivery(1000, 1100, 10, true))

}


async function testAngelOneAdapter() {
    const AngelOneAdapter = require('./adapters/angelone/angeloneadapter')
    let adapter = new AngelOneAdapter(process.env.AG_CLIENT_CODE, process.env.AG_PASSWORD);
    adapter.init()
    let scrips = require('./adapters/angelone/scrip.json')
    scrips = scrips.slice(1, 2)
    for (let index = 0; index < scrips.length; index++) {
        const element = scrips[index];
        console.log(element.symbol)
        let ticks = await adapter.fetchHistoricalData('n', 'c', element.symbol, '1m', "2021-12-11 09:15", "2021-12-10 09:45")
        console.log(element.symbol, ticks.length)
    }

}
testBrokerage()
testAngelOneAdapter()