$('document').ready(function () {


    var actualPin = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

    var form = jQuery('#myForm');
    var pin = jQuery('#pin');
    var val = jQuery('#val');
    var chatArea = jQuery('#chatArea');
    var device_t = jQuery("#device_t")
    var device = jQuery("#device")
    const url = new URL(window.location.href);

    async function start(){
        
        let x = await login('AMC939','Mahan@19','191919')
        console.log(x)
    }

    start()
});