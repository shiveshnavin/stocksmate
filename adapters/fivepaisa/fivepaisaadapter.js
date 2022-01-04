const conf = {
    "appSource": "8337",
    "appName": "5P52870689",
    "userId": "qbCTLQydONB",
    "password": "XItZYsuLI7j",
    "userKey": "IQkAD4Gki3g14AbNNgpiaGC3zsrCoSQg",
    "encryptionKey": "iF7ctDHTmQEKLQx5YV0yN5pZPmf8hvr4"
}
const { FivePaisaClient } = require("5paisajs")


class FivePaisaAdapter {

    client;
    name = '5paisa';
    init(email, password, dob) {
        this.client = new FivePaisaClient(conf)
        return new Promise((res, rej) => {
            this.client.login(email, password, dob).then((response) => {
                this.client.init(response).then(() => {
                    res(this.client)
                })
            }).catch((err) => {
                rej(err)
            })
        })
    }
}

module.exports = FivePaisaAdapter;