Chatbase Integration for Botmatic
=========================

- Botmatic - learn more at [Botmatic.ai](https://botmatic.ai)

- Chatbase - learn more at [Chatbase](https://chatbase.com)


## Setup instructions
---
### Google Cloud Datastore

- store your json credentials in .data/google-account.json
- add your Google project id and Datastore namespace to `.env`

### Secure your endpoint

- add your Botmatic workspace token to `.env`

#### Datastore emulator

If you want to use offline datastore, you can use [datastore emulator](https://cloud.google.com/datastore/docs/tools/datastore-emulator)
Add to .env file:

```shell
DATASTORE_EMULATOR_HOST=localhost:8450
DATASTORE_PROJECT_ID=my-project-id
```

**This will ensure that all requests are coming from Botmatic.ai servers**


## About Botmatic
---
[Botmatic.ai](https://botmatic.ai) is a keyboard first experience where you design your chatbot by writing a conversation. You can create your own integrations and listen to Botmatic events and actions.

\ ゜o゜)ノ
