const debug = require('debug')('botmatic:chatbase')
const chatbase = require('@google/chatbase');

let botmaticChatbase = {}

botmaticChatbase.userMessage = (chatbaseKey, userId, platform, message = "", intent = "", notHandled = false, feedback = false) => {
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

botmaticChatbase.sendToChatbase = (msg, resolve, reject) => {
  debug("sending to chatbase")

  msg
    .send()
    .then(msg => {
      debug('Message sent with success to chatbase', msg)
      resolve({success: true, data: msg.getCreateResponse(), type: 'data'})
    })
    .catch(err => {
      console.error("Error sending message to chatbase: ", err)
      reject({success: false, data: err, type: 'data'})
    });
}

module.exports = botmaticChatbase
