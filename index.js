require('dotenv').config()
const FivePaisaAdapter = require('./adapters/fivepaisa/fivepaisaadapter')

let adapter = new FivePaisaAdapter();

async function main() {
    let stock = 'INFY'
    await adapter.init(process.env.EMAIL, process.env.PASSWORD, process.env.DOB)
    console.log(adapter.name, ' adapter Initialization success')
    let ticks = await adapter.fetchHistoricalData('n', 'c', stock, '15m', '04-01-2022', '04-01-2022')
    console.log('Fetched', ticks.length, 'historical ticks for', stock)
    // console.log(JSON.stringify(ticks, null, 2))
    try {
        let live = await adapter.getMarketFeed('n', 'c', stock)
        console.log(live)
    } catch (e) {
        if (e == 'Success')
            console.log('No data avalable')
        else
            console.log(e.message)
    }

}
main();