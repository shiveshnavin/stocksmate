var axios = require('axios');
var data = JSON.stringify({
  "clientcode": "S1201293",
  "password": "Mahan@19"
});

var config = {
  method: 'post',
  url: 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
  headers: { 
     'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-PrivateKey': 'BHQUxhE6'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  console.log(error);
});
