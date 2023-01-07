function readInputFromFirebase(inputId, table = 'stocksmate_config', db) {

    if (!table)
        table = 'stocksmate_config'
    console.log("Waiting for new", inputId, "in", table)
    const doc = db.collection(table).doc(inputId);


    return new Promise((res, rej) => {
        const unsub = doc.onSnapshot(docSnapshot => {
            let data = docSnapshot.data()
            if (data && !data.isUsed) {
                data.isUsed = true;
                doc.set(data);
                unsub()
                res(data.value)
                console.log("Got new input for", inputId, '=', data.value, "in", table)
            }
        }, err => {
            rej(err)
            console.log(`Encountered error: ${err}`);
        });
    })

}

module.exports = readInputFromFirebase;