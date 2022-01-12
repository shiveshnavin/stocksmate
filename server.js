let express = require('express')
let app = express()
let exec = require('child_process').exec
let trader


app.all('/', function (req, res) {

    res.send(`<html>
    
    <body>

    <h3>
        <a href="/start">START</a>
    </h3>
    <br>
    <h3>
        <a href="/reset">RESET</a>
    </h3>
    <br>
    <h3>
        <a href="/logs">LOGS</a>
    </h3>
    <br>

    </body>
    
    </html>
    `)
})

let observers = []
let logs = ""
let traderKill;

let lastLog = ""
app.all('/start', function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
    killTrader()
    trader = require('./index')
    logs = ""
    observers = []
    traderKill = trader(req.query.stock || 'ADANIGREEN', false, function (params) {
        if (logs.indexOf(params) > -1)
            return
        lastLog = params
        res.write(params)
        if (params.indexOf("Killed") > -1) {
            res.end('Exit')
        }
        logs = logs + params;
        observers.forEach(resop => {
            try {
                if (resop.write)
                    resop.write(params)
                if (resop.end && params.indexOf("Killed") > -1)
                    resop.end('Exit')
            } catch (e) {
            }
        });
    })
})

let killTrader = function (req, res) {

    if (traderKill) {
        traderKill()
    }
    observers = []
    logs = ""
    if (res)
        res.send("Killed")
};
app.all('/reset', killTrader)

app.all('/logs', function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' })
    res.write(logs)
    observers.push(res)
})


app.all('/update', function (req, res) {
    //https://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@github.com/shiveshnavin/stocksmate
    exec('git pull origin master', (error, stdout, stderr) => {
        console.log('Updating and restarting app')
        res.send('DONE! Restarting now...' + error + "\n" + stdout + "\n" + stderr)
        setTimeout(() => {
            process.exit(0)
        }, 2000)
    })
})

let port = process.env.PORT || 8080;
app.listen(port, function (params) {
    console.log('Server started on port ', port)
})