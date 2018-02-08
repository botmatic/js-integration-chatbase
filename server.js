// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var chatbase = require('@google/chatbase');

const { matches } = require('z')
const {match, _, typeOf, instanceOf, $, when} = require('kasai')

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
botmatic.onEvent(botmatic.events.USER_REPLY, function(event) {
  return new Promise((resolve, reject) => {
    console.log(event.data);
    
     match(event.data, [
       
        [{result: {intents: $, source: $}, platform: $, contact_id: $, bot_id: $}, (intents, source, platform, userId, botId) => {
           console.log("1111111")
          var msg = userMessage(userId, platform, source, intents[0])
          sendToChatbase(msg)
          
        }],
       
       [{result: {source: $}, platform: $, contact_id: $, bot_id: $}, (source, platform, userId, botId) => {
         console.log("2222222")
         var msg = userMessage(userId, platform, source, "", true)   
         sendToChatbase(msg)
         
        }],
       
        [_, () => {console.log('pattern match failed')}]
    ]);
    
    resolve({data: "ok", type: "data"});
  })
})

botmatic.onEvent(botmatic.events.BOT_REPLY, function(data) {
  return new Promise((resolve, reject) => {
    console.log(data);
    resolve({data: "ok", type: "data"});
  })
})


// Chatbase helpers
var userMessage = (userId, platform, message = "", intent = "", notHandled = false, feedback = false) => {
  var msg = chatbase.newMessage(process.env.CHATBASE_KEY, userId)
    .setAsTypeUser() // sets the message as type user
    .setTimestamp(Date.now().toString()) // Only unix epochs with Millisecond precision
    .setPlatform(platform)
    .setMessage(message) // the message sent by either user or agent
    .setIntent(intent) // the intent of the sent message (does not have to be set for agent messages)
    .setAsHandled()
    .setAsNotF
  
  if(notHandled){
    msg.setAsNotHandled()
  }
  
  if(feedback){
    msg.setAsFeedback()
  }
  
  return msg

}

var sendToChatbase = (msg) => {
  console.log("sending to chatbase")
  
  msg
    .send()
    .then(msg => console.log(msg.getCreateResponse()))
    .catch(err => console.error(err));
}
