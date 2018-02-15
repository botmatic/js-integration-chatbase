// server.js
// where your node app starts

// init project
const debug = require('debug')('botmatic:chatbase')
var express = require('express');
var app = express();
var chatbase = require('@google/chatbase');

const fs = require('fs');
const tmpFile = require('tmp-file');
const Datastore = require('@google-cloud/datastore');
const {match, _, typeOf, instanceOf, $, when} = require('kasai');

const Mustache = require('mustache')
const tplFieldsBuf = fs.readFileSync(__dirname + '/views/fields.html');
const tplFieldsStr = tplFieldsBuf.toString('utf8')

require('dotenv').config()

// const botmatic = require('@botmatic/js-integration')({
const botmatic = require('../botmatic-js-integration/src/index')({
  'server': app,
  'path': '/botmatic',
  'token': 'test',
  auth: async (token) => {
    return new Promise(async (resolve, reject) => {
      const chatbase = await getChatbaseByToken(token)

      if (chatbase) {
        resolve(chatbase)
      } else {
        reject('No chatbase found with token: ' + token)
      }
    });
  }
});

const googleKeyFile = '/tmp/google-account.json';
// synchronous write - only when starting the app so that's okay.
fs.writeFileSync('/tmp/google-account.json', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const datastore = new Datastore({
  // projectId: process.env.GOOGLE_PROJECT_ID,
  // namespace: process.env.GOOGLE_DATASTORE_NS,
  // keyFilename: googleKeyFile
});

const taskKey = datastore.key(["Chatbase"]);

/**
 * Find Chatbase objcet in datastore by token
 * @param  {String} token Botmatic integration token
 * @return {Promise} resolve object or null
 */
const getChatbaseByToken = (token) => {
  return new Promise((resolve) => {
    const query = datastore.createQuery('Chatbase')
      .filter('token', '=', token)
      .limit(1)

    datastore
      .runQuery(query)
      .then(results => {
        if ( results && results.length > 0 && results[0].length > 0) {
          resolve(results[0][0])
        } else {
          resolve(null);
        }
      })
      .catch(err => {
        console.error(`ERROR retrivieng chatbase from datastore: `, err)
        resolve(null);
      })
  })
}

/**
 * Settings form integration page.
 */
botmatic.onSettingsPage("/settingspath", (token) => {
  return new Promise(async (resolve) => {

    // Find API key by token.
    const chatbase = await getChatbaseByToken(token)
    let tpl;

    // If exists, inject in template.
    if (chatbase) {
      tpl = Mustache.render(tplFieldsStr, {name: "api_key", value: chatbase.api_key});
    } else {
      tpl = Mustache.render(tplFieldsStr, {name: "api_key", value: ""})
    }

    resolve(tpl)
  })
})

/**
 * When Botmatic integration form is submitted, update datastore with client.
 * @param  {String} token Botmatic integration token
 * @param  {Object} data  Content the event
 * @return {Promise}
 */
botmatic.onUpdateSettings('/settingspath', function(token, data) {
  return new Promise(async (resolve) => {
    // Check if API key is given.
    if (data.api_key) {
      // Get chatbase by token.
      let chatbase = await getChatbaseByToken(token)

      var chatbaseToSave = {
        key: taskKey
      }

      // Construct data to save in datastore
      if ( chatbase ) {
        chatbase.api_key = data.api_key
        chatbaseToSave.data = chatbase
      } else {
        chatbaseToSave.data = {
          token: token,
          api_key: data.api_key
        };
      }

      // Saves the entity
      datastore
        .save(chatbase)
        .then(() => {
          debug(`Saved ${chatbase.key}: ${chatbase.data}`);
          resolve({success: true})
        })
        .catch(err => {
          console.error('ERROR:', err);
          resolve({success: false, error: err})
        });
    } else {
      console.error('ERROR:', "API key is required.");
      resolve({success: false, error: "API key is required."})
    }
  })
})

/**
 * Listen Botmatic user_reply event.
 * @type {Object}
 * - data: event received
 * - auth: contains token and client with chatbase found in datastore by token.
 */
botmatic.onEvent(botmatic.events.USER_REPLY, ({data, auth}) => {
  return new Promise(async (resolve, reject) => {
    match(data.data, [
     [{result: {intents: $, source: $}, platform: $, contact_id: $, bot_id: $}, (intents, source, platform, userId, botId) => {
       var msg = userMessage(auth.client.api_key, userId, platform, source, intents[0].slug)
       sendToChatbase(msg, resolve, reject)
     }],

    [{result: {source: $}, platform: $, contact_id: $, bot_id: $}, (source, platform, userId, botId) => {
      var msg = userMessage(auth.client.api_key, userId, platform, source, "", true)
      sendToChatbase(msg, resolve, reject)
     }],

     [_, () => {
       console.log('pattern match failed')
       reject({success: false, data: 'pattern match failed'})
     }]
   ]);
  })
})

/**
 * Listen Botmatic bot_reply event.
 * @type {Object}
 * - data: event received
 * - auth: contains token and client with chatbase found in datastore by token.
 */
botmatic.onEvent(botmatic.events.BOT_REPLY, ({data, auth}) => {
  return new Promise(async (resolve, reject) => {
    var msg = userMessage(auth.client.api_key, data.data.contact_id, data.data.platform, data.data.content, "", true)
    sendToChatbase(msg, resolve, reject)
  })
})

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// listen for requests
var listener = app.listen(9876, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

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

  return msg
}

var sendToChatbase = (msg, resolve, reject) => {
  debug("sending to chatbase")

  msg
    .send()
    .then(msg => {
      debug('Message sent with success to chatbase')
      console.log(msg)
      resolve({success: true, data: msg.getCreateResponse(), type: 'data'})
    })
    .catch(err => {
      console.error("Error sending message to chatbase: ", err)
      reject({success: false, data: err, type: 'data'})
    });
}
