const debug = require('debug')('botmatic:index-chatbase')

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
