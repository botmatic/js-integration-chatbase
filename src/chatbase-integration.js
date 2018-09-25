const debug = require('debug')('botmatic:chatbase-integration')
const fs = require('fs');
const Mustache = require('mustache')
const tplFieldsBuf = fs.readFileSync(__dirname + '/../views/fields.html');
const tplFieldsStr = tplFieldsBuf.toString('utf8')
const {match, _, typeOf, instanceOf, $, when} = require('kasai');
const botmaticChatbase = require('./chatbase');

const start = (botmatic, botmaticDatastore) => {
  /**
   * Settings form integration page.
   */
  botmatic.onSettingsPage("/settingspath", (token) => {
    // console.log('ON SETTINGS PATH')
    return new Promise(async (resolve) => {

      // console.log('getting chatbase by token', token)
      // Find API key by token.
      const chatbase = await botmaticDatastore.getChatbaseByToken(token)

      // console.log('get chatbase from datastore', chatbase)

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

        // console.log('SAVE api key with token', token)

        // Get chatbase by token.
        let chatbase = await botmaticDatastore.getChatbaseByToken(token)

        // console.log("token", token)
        // console.log("data.api_key to save", data.api_key)

        const res = await botmaticDatastore.saveChatbase(chatbase, token, data.api_key)

        // console.log("res", res)
        resolve(res)
      } else {
        console.error('ERROR:', "API key is required.");
        resolve({
          success: false,
          errorFields: {
            api_key: "Field required"
          }
        })
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
    // console.log("data", JSON.stringify(data))

    return new Promise(async (resolve, reject) => {
      match(data.data, [
       [{result: {intents: $, source: $}, platform: $, contact_id: $, bot_id: $}, (intents, source, platform, userId, botId) => {
         
        // console.log('INTENT FOUND !!!!!!!')
        // console.log("auth.client.api_key", auth.client.api_key)
        // console.log("userId", userId)
        // console.log("platform", platform)
        // console.log('source', source)
        // console.log('intents[0].slug', intents[0].slug)

         var msg = botmaticChatbase.userMessage(auth.client.api_key, userId, platform, source, intents[0].slug)
        //  var msg = botmaticChatbase.userMessage(auth.client.api_key, userId, platform, source, "", true)
         botmaticChatbase.sendToChatbase(msg, resolve, reject)
       }],

      [{result: {source: $}, platform: $, contact_id: $, bot_id: $}, (source, platform, userId, botId) => {

        // console.log('INTENT NOT NOT NOT FOUND !!!!!!!')

        var msg = botmaticChatbase.userMessage(auth.client.api_key, userId, platform, source, "", true)
        botmaticChatbase.sendToChatbase(msg, resolve, reject)
       }],

       [_, () => {
         console.error('pattern match failed')
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
    let message = ""
    
    try {
      const messageJSON = JSON.parse(data.data.message)
      message = messageJSON.content
    } catch (e) {}

    return new Promise(async (resolve, reject) => {
      var msg = botmaticChatbase.userMessage(auth.client.api_key, data.data.contact_id, data.data.platform, message, "", true)
      botmaticChatbase.sendToChatbase(msg, resolve, reject)
    })
  })
}

const init = (params = {}) => {
  const botmaticDatastore = require('./datastore')

  const botmatic = require('@botmatic/js-integration')({
    'port': params.port || 9876,
    'endpoint': params.endpoint || "/",
    auth: async (token) => {
      return new Promise(async (resolve, reject) => {
        const chatbase = await botmaticDatastore.getChatbaseByToken(token)

        if (chatbase) {
          resolve(chatbase)
        } else {
          reject('No chatbase found with token: ' + token)
        }
      });
    }
  });

  start(botmatic, botmaticDatastore)
}

module.exports = (params) => init(params)
