require('dotenv').config()
const FivePaisaAdapter = require('./adapters/fivepaisa/fivepaisaadapter')

let adapter = new FivePaisaAdapter();

async function main() {
    await adapter.init(process.env.EMAIL, process.env.PASSWORD, process.env.DOB)
    console.log( adapter.name, ' adapter Initialization success')
}
main();