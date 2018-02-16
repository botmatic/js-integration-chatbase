const debug = require('debug')('botmatic:index-chatbase')

require('dotenv').config({
  path: __dirname+'/.env'
})

require('./src/chatbase-integration')({
  port: 9865
})
