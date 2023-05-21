import vosk from 'vosk';
import fs from 'fs';
import mic from 'mic';
import { fileURLToPath } from 'url';
import path from 'path';
import 'isomorphic-fetch';
import util from "util";
import dotenv from "dotenv";
import { ChatGPTAPI } from 'chatgpt';
import textToSpeech from "@google-cloud/text-to-speech";
import Audic from 'audic';
import getMP3Duration from 'get-mp3-duration';
import config from '../assistant_config.mjs';
 
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lang = config.language;
const answerWordLimit = config.answerWordLimit;
const lowMemoryVariant = config.lowMemoryVariant;
const assistantName = config.assistantName;
const memeTrigger = config.memeTrigger;
const systemMessage = config.gptSystemMessage;

let lastRequestId = null;
const eventTimeoutMs = 200;

const debug = false;

let modelPaths = {
    de: __dirname + "/../language_models/vosk-model-de-0.21",
    en: __dirname + "/../language_models/vosk-model-en-us-0.22"
}

if (lowMemoryVariant) {
    modelPaths = {
        de: __dirname + "/../language_models/vosk-model-small-de-0.15",
        en: __dirname + "/../language_models/vosk-model-en-us-0.22-lgraph"
    }
}

const languageMapping = {
    en: 'en-US',
    de: 'de-DE'
}

const voices = {
    de: 'de-DE-Neural2-B',//A,C,D
    en: 'en-US-Neural2-I'//A,D,I
}

const messagePostFix = {
    en: `Answer in less than ${answerWordLimit} words if possible.`,
    de: `Antworte in unter ${answerWordLimit} Wörtern, wenn möglich.`
}

const continueMatches = {
    de: 'nochmal',
    en: 'next'
}

const MODEL_PATH = modelPaths[lang];
const SAMPLE_RATE = 16000;

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
let rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });


const chatGPTAPI = new ChatGPTAPI({ apiKey: process.env.OPEN_AI_APIKEY, systemMessage })
const ttsApi = new textToSpeech.TextToSpeechClient();
let memeLoop = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function triggerEvent(name, value) {
    const event = { name, value };
    const events = [event];
    const data = JSON.stringify(events);
    console.log(data);
}

async function synthesizeSpeech(text) {
    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: languageMapping[lang], name: voices[lang], ssmlGender: 'MALE' },
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await ttsApi.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(`./sounds/${lang}/gpt_answer.mp3`, response.audioContent, 'binary');
    await sleep(eventTimeoutMs);
}

async function askChatGpt(message) {
    const opts = {};

    message = `${message}. ${messagePostFix[lang]}`;
    if (lastRequestId) {
        opts.parentMessageId = lastRequestId
    }
    const response = await chatGPTAPI.sendMessage(message, opts);
    lastRequestId = response.id;
    return response.text;
}


async function fetchMeme() {
    const memeApi = 'https://meme-api.com/gimme';
    const response = await fetch(memeApi);
    const result = await response.json();

    triggerEvent('meme', result.url);
}

const micInstance = mic({
    rate: String(SAMPLE_RATE),
    channels: '1',
    debug: false,
    device: 'default',
});

let active = false;
let disabled = false;
let recordingCache = '';
let cacheCounter = 0;
const minimumDisabledMs = 5000;
const maxAttemptsRecording = 5;

const voiceRecognition = {
    hotwords: {
        activate: [],
        activateMeme: ''
    },
    initHotwords: () => {
        const prefixes = ['hey', 'he', 'the']
        voiceRecognition.hotwords.activate = prefixes.map(prefix => {
            return `${prefix} ${assistantName}`;
        });
        voiceRecognition.hotwords.activateMeme = memeTrigger;
    },
    start: () => {
        voiceRecognition.initHotwords();
        const micInputStream = micInstance.getAudioStream();

        micInputStream.on('data', data => {
            voiceRecognition.checkHotword(data);
            voiceRecognition.handleInput(data);
            voiceRecognition.checkStop(data);
        });

        micInputStream.on('audioProcessExitComplete', function () {
            console.log(rec.finalResult());
            rec.free();
            model.free();
        });

        process.on('SIGINT', function () {
            console.log("\nStopping");
            micInstance.stop();
        });

        micInstance.start();
    },
    handleInput: async (data) => {
        if (disabled) {
            rec.reset();
        }
        if (!active || disabled) return;
        const isSilent = rec.acceptWaveform(data); 4

        let isFinalAttempt = false;
        let result = rec.partialResult();

        if (result.partial.includes('stop') && result.partial.length <= 10) {
            triggerEvent('stop', true);
            rec.reset();
            active = false;
            return;
        }

        let inputTooShort = result.partial && result.partial.length < 6;
        let notEnoughWords = result.partial.split(' ').length < 3;
        if (!result.partial || inputTooShort || notEnoughWords) {
            return;
        }
        if (result.partial === recordingCache) {
            cacheCounter++;
        } else {
            recordingCache = result.partial;
            cacheCounter = 0;
        }

        if (cacheCounter > maxAttemptsRecording) {
            isFinalAttempt = true;
            result = rec.finalResult();
        }


        if (isSilent || isFinalAttempt) {
            result = isFinalAttempt ? result : rec.result();
            result = normalizeResult(result);

            if (result.text.includes('stop') && result.text.length <= 20) {
                triggerEvent('stop', true);
                rec.reset();
                active = false;
                return;
            }

            
            if (result.text && debug) {
                triggerEvent('voice_input_debug', result.text)
            }

            let questionEvent = {
                name: 'question',
                value: result.text
            };

            const gptStartEvent = {
                name: 'gpt_start',
                value: true
            };

            let events = [questionEvent, gptStartEvent];
            data = JSON.stringify(events);
            console.log(data);
            active = false;

            const answer = await askChatGpt(result.text);

            triggerEvent('answer', answer);
            await synthesizeSpeech(answer);
            triggerEvent('tts', true);
            playSound('gpt_answer', true);
        } else {
            if (result.partial && debug) {
                triggerEvent('voice_input_partial', result.partial)
            }

        }
    },
    checkHotword: async (data) => {
        if (disabled) {
            rec.reset();
        }
        if (active || disabled) return;
        let result = '';
        if (rec.acceptWaveform(data)) {
            result = rec.result();
        } else {
            result = rec.partialResult();
            result.text = result.partial;
        }

        result = normalizeResult(result);
        let match = false;
        voiceRecognition.hotwords.activate.forEach(hotword => {
            if (result.text.includes(hotword)) {
                match = true;
            }
        });

        if (result.text && debug) {
            triggerEvent('voice_input_hotword', result.text);
        }

        if (match) {
            rec.reset();
            active = true;
            disabled = false;
            triggerEvent('voice_input_start', true);
        }

        let memeMatch = false;
        if (result.text.includes(voiceRecognition.hotwords.activateMeme)) {
            memeMatch = true;
        }

        if (memeMatch) {
            memeLoop = true;
            rec.reset();
            disabled = true;
            triggerEvent('meme_hotword', true);
            fetchMeme();
            playSound('meme_hotword_answer', false);
            setTimeout(() => {
                disabled = false;
            }, minimumDisabledMs)
        }

        let memeContinueMatch = result.text.includes(continueMatches[lang]);

        if (memeContinueMatch && memeLoop) {
            disabled = true;
            triggerEvent('meme', true);
            fetchMeme();
            setTimeout(() => {
                disabled = false;
            }, 1000);
        }

        let stopMatch = result.text.includes('stop');

        if (stopMatch && memeLoop) {
            memeLoop = false;
            rec.reset();
            triggerEvent('meme_stop', true);
        }
    },
    checkStop: async (data) => {
        if (!disabled) return;
        let result = '';
        if (rec.acceptWaveform(data)) {
            result = rec.result();
        } else {
            result = rec.partialResult();
            result.text = result.partial;
        }

        result = normalizeResult(result);
        let match = false;
        if (result.text.includes('stop')) {
            match = true;
        }

        if (match) {
            rec.reset();
            active = false;
            disabled = false;
            triggerEvent('stop', true);
        }
    }
}

async function playSound(name) {
    disabled = true;
    const mp3File = `./sounds/${lang}/${name}.mp3`;
    const buffer = fs.readFileSync(mp3File);
    const duration = getMP3Duration(buffer);
    const audic = new Audic(mp3File);
    // ended event does not work correctly
    // workaround is getting duration of mp3 in ms
    // then when sound starts playing we set timeout 
    // to trigger end event of tts
    audic.addEventListener('playing', () => {
        setTimeout(() => {
            disabled = false;
            triggerEvent('tts_end', true);
        }, duration);
    });
    audic.play();
}

function normalizeResult(result) {
    if (lang === 'de') {
        if (result.text.startsWith('einen')) {
            result.text = result.text === 'einen' ? '' : result.text.substring(4);
        }

        result.text = result.text.replace('wie kann ich helfen', '');
    }
    if (lang === 'en') {
        if (result.text.startsWith('a ')) {
            result.text = result.text.substring(3);
        }
        if (result.text.startsWith('please')) {
            result.text = result.text === 'please' ? '' : result.text.substring(7);
        }
        if (result.text.startsWith('the')) {
            result.text = result.text === 'the' ? '' : result.text.substring(4);
        }

        result.text = result.text.replace('how can I help', '');
    }

    result.text = result.text.trim();

    return result;
}

console.log(JSON.stringify([{ name: 'LOG:', value: 'Vosk Speech-to-Text started!' }]));
voiceRecognition.start();
