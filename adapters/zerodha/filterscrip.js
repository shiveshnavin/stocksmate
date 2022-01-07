let blob = require('./scrips.json')
let fs = require('fs')


let op = []
blob.forEach(element => {
    if (element.instrument_type == 'EQ' && element.exchange == "NSE") {
        op.push(element)
    }
});
fs.writeFileSync('./scrip.json', JSON.stringify(op, null, 2))