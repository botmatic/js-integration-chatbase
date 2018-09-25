const debug = require('debug')('botmatic:datastore')
const Datastore = require('@google-cloud/datastore');
const fs = require('fs');
const googleKeyFile = '/tmp/google-account.json';

require('tmp-file');
fs.writeFileSync('/tmp/google-account.json', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const datastore = new Datastore({
  projectId: process.env.GOOGLE_PROJECT_ID,
  namespace: process.env.GOOGLE_DATASTORE_NS,
  keyFilename: googleKeyFile
});

const taskKey = datastore.key(["Chatbase"]);

let botmaticDatastore = {}

/**
 * Find Chatbase objcet in datastore by token
 * @param  {String} token Botmatic integration token
 * @return {Promise} resolve object or null
 */
botmaticDatastore.getChatbaseByToken = (token) => {
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

botmaticDatastore.saveChatbase = (chatbase, token, api_key) => {
  return new Promise((resolve) => {
    var chatbaseToSave = {
      key: taskKey
    }

    // Construct data to save in datastore
    if ( chatbase ) {
      chatbase.api_key = api_key
      chatbaseToSave.data = chatbase
    } else {
      chatbaseToSave.data = {
        token: token,
        api_key: api_key
      };
    }

    // Saves the entity
    datastore
      .save(chatbaseToSave)
      .then(() => {
        // console.log(`Saved ${JSON.stringify(chatbaseToSave.key)}: ${JSON.stringify(chatbaseToSave.data)}`);
        resolve({success: true})
      })
      .catch(err => {
        console.error('ERROR:', err);
        resolve({success: false, error: err})
      });
  })
}

module.exports = botmaticDatastore
