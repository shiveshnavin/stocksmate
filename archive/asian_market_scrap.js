let axios = require('axios')
let cheerio = require('cheerio')
const { r, g, b, w, c, m, y, k } = [
    ['r', 1], ['g', 2], ['b', 4], ['w', 7],
    ['c', 6], ['m', 5], ['y', 3], ['k', 0],
].reduce((cols, col) => ({
    ...cols, [col[0]]: f => `\x1b[3${col[1]}m${f}\x1b[0m`
}), {})



async function fetchHTML(url) {
    const { data } = await axios.get(url)
    return cheerio.load(data)
}

async function getRegionalOutlook(region) {
    let url = "https://money.cnn.com/data/world_markets/" + region
    const $ = await fetchHTML(url)
    console.log('Start scraping', url, '\n')
    let pos = 0;
    let neg = 0;

    for (let i = 2; i < 8; i++) {
        let nameSelector = `#wsod_indexDataTableGrid > tbody > tr:nth-child(${i}) > td:nth-child(2) > a`;
        let perChangeSelector = `#wsod_indexDataTableGrid > tbody > tr:nth-child(${i}) > td:nth-child(5) > span > span`;
        let absValSelector = `#wsod_indexDataTableGrid > tbody > tr:nth-child(${i}) > td:nth-child(4) > span > span`;
        let mktIndicatorSel = `#wsod_indexDataTableGrid > tbody > tr:nth-child(${i}) > td:nth-child(1) > img`
        let timingSel = `#wsod_indexDataTableGrid > tbody > tr:nth-child(${i}) > td:nth-child(7) > span > span`

        let name = $(nameSelector).text()
        let absValue = $(absValSelector).text()
        let perValue = $(perChangeSelector).text()
        let isOpen = $(mktIndicatorSel).attr('src').indexOf('marketOpen') > -1
        let lastUpdated = $(timingSel).text()

        if (name && name.length > 0) {
            let isPos = parseFloat(absValue) > 0
            let col;
            if (isPos) {
                pos++;
                col = g;
            }
            else {
                col = r;
                neg++;
            }
            console.log(`[${isOpen ? g('Open') : y('Closed')}]`, isPos ? g('+') : r('-'), lastUpdated, '|', col(absValue), '|', col(perValue), '|', name)
        }
    }
    return pos > neg;

}

module.exports = getRegionalOutlook;