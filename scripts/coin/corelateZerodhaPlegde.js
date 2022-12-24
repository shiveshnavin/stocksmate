let axios = require('axios')
let fs = require('fs')
let data = require('./old_info/data.json');

let result = []
let i = 0;
function checkMF(item) {
    let url = `https://coin.zerodha.com/mf/fund/${item.isin}`
    let checkUrl = `https://staticassets.zerodha.com/coin/amc-sip-master/${item.isin}.json`

    return new Promise((res, rej) => {
        axios({
            method: 'get',
            url: checkUrl,
        }).then(function (response) {
            // console.log(response)
            item.url = url
            result.push(item)
            console.log((`${i++}/${data.length}`) + ' Done ', item.isin)
            res()
        }).catch(e => {
            console.log((`${i++}/${data.length}`) + ' No coin data found for ', item.isin)
            res()
        })
    })
}

let promises = [];
data.forEach(element => {
    promises.push(checkMF(element))
});

Promise.all(promises).then(() => {
    fs.writeFileSync('./coin.json', JSON.stringify(result, undefined, 2))
})
