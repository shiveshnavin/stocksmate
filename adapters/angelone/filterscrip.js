let blob = require('./OpenAPIScripMaster.json')
let fs = require('fs')


let op = []
blob.forEach(element => {
    if (element.symbol.indexOf("-EQ") > -1) {
        element.symbol = element.symbol.replace("-EQ","");
        op.push(element)
    }
});
fs.writeFileSync('./scrip.json', JSON.stringify(op, null, 2))