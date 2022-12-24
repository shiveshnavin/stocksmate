
module.exports = {
    /**
     * 
     * @param {Array} array An array of data items
     * @param {Function} worker Function will be called for each item. This function must return a Promise
     */
    run: function (array, worker) {

        let promises = []
        array?.forEach(item => {
            promises.push(worker(item))
        });

        return Promise.all(promises)
    }
}