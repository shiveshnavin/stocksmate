let blob = require('./scripmaster-csv-format.json')
let fs = require('fs')


let op = []
blob.forEach(element => {
    if (element.Name.indexOf(" ") == -1) {
        op.push(element)
    }
});
fs.writeFileSync('./scrip.json', JSON.stringify(op, null, 2))