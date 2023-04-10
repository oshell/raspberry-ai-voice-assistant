# ai-voice-assistant

## Project setup
```
npm install
```

## Google Setup
- you need google account with text-to-speech api enabled (https://cloud.google.com/text-to-speech/docs)
- globally install gcloud (`npm i gcloud -i`)
- authenticate using `gcloud auth application-default login` 

## ChatGPT Setup
- create `.env` file with this content replacing `{{your-api-key}}`
- can be obtained on openai homepage (https://platform.openai.com/account/api-keys)

```
OPEN_AI_APIKEY="{{your-api-key}}"

```

## Language Model Setup

- download models here: https://alphacephei.com/vosk/models
- create folder language_models
- extract downloaded language model in there
- adjust `modelPaths` in `src/voice_assistant.mjs`

### Compiles and hot-reloads for development
```
npm run electron:serve
```

## Customization
- to change the image, simply drop image under `src/assets` and adjust part in `AiAssistant.vue`
- to change the language, adjust `lang` in `src/voice_assistant.mjs` (needs to have language model defined in `modelPaths`)
- to change hotword, adjust `voiceRecognition.hotwords` in `src/voice_assistant.mjs`
- to change personality, adjust `systemMessage` in `src/voice_assistant.mjs`
