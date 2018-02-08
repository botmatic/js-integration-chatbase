// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

const botmatic = require('@botmatic/js-integration')({'server': app, 'path': '/botmatic', 'token': 'test'})

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});



// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

// listen for Botmatic events
botmatic.onEvent(botmatic.events.USER_REPLY, function(data) {
  return new Promise((resolve, reject) => {
    console.log(data);
    resolve({data: "ok", type: "data"});
  })
})

botmatic.onEvent(botmatic.events.BOT_REPLY, function(data) {
  return new Promise((resolve, reject) => {
    console.log(data);
    resolve({data: "ok", type: "data"});
  })
})
