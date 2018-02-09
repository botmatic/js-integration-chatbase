// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var chatbase = require('@google/chatbase');

const Datastore = require('@google-cloud/datastore');
const {match, _, typeOf, instanceOf, $, when} = require('kasai')
const botmatic = require('@botmatic/js-integration')({'server': app, 'path': '/botmatic', 'token': 'test'})
const datastore = new Datastore({
  projectId: process.env.GOOGLE_PROJECT_ID,
  namespaceId: process.env.GOOGLE_DATASTORE_NS
});

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});


// listen for requests
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

// listen for Botmatic events
botmatic.onEvent(botmatic.events.USER_REPLY, function(event) {
  getChatbaseKey(datastore)
  
  return new Promise((resolve, reject) => {
    console.log(event.data);
    
     match(event.data, [
       
        [{result: {intents: $, source: $}, platform: $, contact_id: $, bot_id: $}, (intents, source, platform, userId, botId) => {
          
          var msg = userMessage(process.env.CHATBASE_KEY, userId, platform, source, intents[0].slug)
          sendToChatbase(msg, resolve, reject)
          
        }],
       
       [{result: {source: $}, platform: $, contact_id: $, bot_id: $}, (source, platform, userId, botId) => {
         
         var msg = userMessage(process.env.CHATBASE_KEY, userId, platform, source, "", true)   
         sendToChatbase(msg, resolve, reject)
         
        }],
       
        [_, () => {
          
          console.log('pattern match failed')
          reject({success: false, data: 'pattern match failed'})
          
        }]
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

// Google Datastore
var getChatbaseKey = (datastore) => {
  const query = datastore.createQuery('Chatbase')
  
  //const query = datastore.createQuery('test')
    //.filter('chatbase_key', '=', process.env.CHATBASE_KEY)

  datastore
    .runQuery(query)
    .then(results => {
      console.log('Chatbase key:');
      console.log(results);
      /*tasks.forEach(task => {
        const taskKey = task[datastore.KEY];
        console.log(taskKey.id, task);
      });*/
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}



// Chatbase helpers
var userMessage = (chatbaseKey, userId, platform, message = "", intent = "", notHandled = false, feedback = false) => {
  var msg = chatbase.newMessage(chatbaseKey, userId.toString())
    .setAsTypeUser() // sets the message as type user
    .setTimestamp(Date.now().toString()) // Only unix epochs with Millisecond precision
    .setPlatform(platform)
    .setMessage(message) // the message sent by either user or agent
    .setIntent(intent) // the intent of the sent message (does not have to be set for agent messages)
    .setAsHandled()
    .setAsNotFeedback()
  
  if(notHandled){
    msg.setAsNotHandled()
  }
  
  if(feedback){
    msg.setAsFeedback()
  }
  
  console.log(msg)
  return msg

}

var sendToChatbase = (msg, resolve, reject) => {
  console.log("sending to chatbase")
  
  msg
    .send()
    .then(msg => resolve({success: true, data: msg.getCreateResponse(), type: 'data'}))
    .catch(err => reject({success: false, data: err, type: 'data'}));
}
