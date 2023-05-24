# ai-voice-assistant

electron based ai voice assistant utilizing gcloud text-to-speech and speech-to-text and openai chatgpt.
on machines with enough power, you can use vosk for complete offline voice recgnition.

## Prerequisite

- debian based OS (tested on Ubuntu and Raspberrypi OS)
- node 16 (recommended install via nvm https://github.com/nvm-sh/nvm)
## Project setup
```
npm install --legacy-peer-deps
```

## Google Setup
- install gcloud cli (https://cloud.google.com/sdk/docs/install?hl=de#deb)
- you need google account with Cloud Text-to-Speech API enabled (https://cloud.google.com/text-to-speech/docs)
- you also need Cloud Speech-to-Text API enabled if not using VOSK (can be configured in assistant_config.mjs)
- after enabling both, you need to create a service account for this project and download a credentials JSON file that looks like this

```
{
    "type": "service_account",
    "project_id": "{{your_project_id}}",
    "private_key_id": "{{your_private_key_id}}",
    "private_key": "{{your_private_key}}",
    "client_email": "local-account@{{your_project_id}}.iam.gserviceaccount.com",
    "client_id": "{{your_client_id}}",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/local-account%40{{your_project_id}}.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  }
  
```

- put this file in the root directory of the project and adjust your .env file to point to this credentials file
```
GOOGLE_APPLICATION_CREDENTIALS="/home/your-projects-directory/raspberry-ai-voice-assitant/google_client_secret.json"
```
## ChatGPT Setup
- create `.env` file with this content replacing `{{your-api-key}}`
- can be obtained on openai homepage (https://platform.openai.com/account/api-keys)

```
OPEN_AI_APIKEY="{{your-api-key}}"

```

## Language Model Setup

- voice assistant can be used with offline voice recognition
- language models will be loaded into RAM, so this requires a laptop or later version of raspberry pi
- to enable vosk, adjust `assistant_config.mjs`
- download models here: https://alphacephei.com/vosk/models
- create folder language_models in project root
- extract downloaded language model in there
- adjust `modelPaths` in `src/voice_assistant_vosk.mjs`

## Run the voice assitant
```
npm run electron:serve
```

## Customization

- check `assistant_config.mjs`

```
const assistantName = 'Felix';

export default {
    'useLocalSpeechToText': false, // if true uses vosk (free), if false uses google speech to text
    'lowMemoryVariant': false, // if useLocalSpeechToText is true, this determines, if big language model is used
    'language': 'de', // language used for speech to text and answers from chatGPT
    'answerWordLimit': 30, // limits the requested words of an answer from chatGPT
    'assistantName': assistantName, // this is how you activate the voice assistant using "Hey, ${name}",
    "memeTrigger": 'listiges Bild', // if you say this, assistant will fetch a meme from reddit and show it,
    "gptSystemMessage": `Du bist einer virtueller Sprachassistent. Dein Name ist ${assistantName}. Du gibst kurze genaue Antworten. Das Aktuelle Datum ist: ${new Date().toISOString()}\n\n`
};
```