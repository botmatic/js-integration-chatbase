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
    return new Promise(async (resolve) => {

      // Find API key by token.
      const chatbase = await botmaticDatastore.getChatbaseByToken(token)
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
        let chatbase = await botmaticDatastore.getChatbaseByToken(token)
        const res = await botmaticDatastore.saveChatbase(chatbase, token, data.api_key)
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
    return new Promise(async (resolve, reject) => {
      match(data.data, [
       [{result: {intents: $, source: $}, platform: $, contact_id: $, bot_id: $}, (intents, source, platform, userId, botId) => {
         var msg = botmaticChatbase.userMessage(auth.client.api_key, userId, platform, source, intents[0].slug)
         botmaticChatbase.sendToChatbase(msg, resolve, reject)
       }],

      [{result: {source: $}, platform: $, contact_id: $, bot_id: $}, (source, platform, userId, botId) => {
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
    return new Promise(async (resolve, reject) => {
      var msg = botmaticChatbase.userMessage(auth.client.api_key, data.data.contact_id, data.data.platform, data.data.content, "", true)
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
