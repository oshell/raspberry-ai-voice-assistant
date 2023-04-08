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

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lang = 'en';

let lastRequestId = null;

const modelPaths = {
    de: __dirname + "/../language_models/vosk-model-de-0.21",
    en: __dirname + "/../language_models/vosk-model-en-us-0.22"
}

const languageMapping = {
    en: 'en-US',
    de: 'de-DE'
}

const voiceAssistantNames = {
    en: 'Buddy',
    de: 'Charlie'
}

const voices = {
    de: 'de-DE-Neural2-B',//A,C,D
    en: 'en-US-Neural2-I'//A,D,I
}

const MODEL_PATH = modelPaths[lang];
const SAMPLE_RATE = 16000;

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

vosk.setLogLevel(0);
const debug = false;
const model = new vosk.Model(MODEL_PATH);
let rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

const systemMessage = `You are CorgiAI, a virtual dog and voice assistant coming from the future. Your name is ${voiceAssistantNames[lang]}. You love your owner Hoschi. You try to keep your answers below 100 words.
Current date: ${new Date().toISOString()}\n\n`
const chatGPTAPI = new ChatGPTAPI({ apiKey: process.env.OPEN_AI_APIKEY, systemMessage })
const ttsApi = new textToSpeech.TextToSpeechClient();

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
}

async function askChatGpt(message) {
    const opts = {};
    if (lastRequestId) {
        opts.parentMessageId = lastRequestId
    }
    const response = await chatGPTAPI.sendMessage(message, opts);
    lastRequestId = response.id;
    return response.text;
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
const minimumDisabledMs = 4000;
const maxAttemptsRecording = 5;

const voiceRecognition = {
    hotwords: {
        en: [
            'hey buddy',
            'the buddy',
        ],
        de: [
            'hey charlie',
            'hey charly',
            'he charlie',
            'he charly',
        ],
    },
    start: () => {
        const micInputStream = micInstance.getAudioStream();

        micInputStream.on('data', data => {
            voiceRecognition.checkHotword(data);
            voiceRecognition.handleInput(data);
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
        const isSilent = rec.acceptWaveform(data);

        let isFinalAttempt = false;
        let result = rec.partialResult();

        let inputTooShort = result.partial && result.partial.length < 6;
        if (!result.partial || inputTooShort) {
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
            if (result.text && debug) {
                const event = {
                    name: 'voice_input_debug',
                    value: result.text
                };
                const events = [event]
                const data = JSON.stringify(events);
                console.log(data);
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

            const gptAnswerEvent = {
                name: 'answer',
                value: answer
            }
            events = [gptAnswerEvent];
            data = JSON.stringify(events);
            console.log(data);

            await synthesizeSpeech(answer);
            const ttsEvent = {
                name: 'tts',
                value: true
            }
            events = [ttsEvent];
            data = JSON.stringify(events);
            console.log(data);

            playSound('gpt_answer', true)
        } else {
            if (result.partial && debug) {
                const event = {
                    name: 'voice_input_partial',
                    value: result.partial
                };
                const events = [event]
                const data = JSON.stringify(events);
                console.log(data);
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
        voiceRecognition.hotwords[lang].forEach(hotword => {
            if (result.text.includes(hotword)) {
                match = true;
            }
        });

        if (result.text && debug) {
            const event = {
                name: 'voice_input_hotword',
                value: result.text
            };
            const events = [event]
            const data = JSON.stringify(events);
            console.log(data);
        }

        if (match) {
            const event = {
                name: 'hotword',
                value: true
            };
            const events = [event]
            const data = JSON.stringify(events);
            rec.reset();
            console.log(data);
            active = true;
            disabled = true;

            playSound('hotword_answer_1', false);
            setTimeout(() => {
                const event = {
                    name: 'voice_input_start',
                    value: true
                };
                const events = [event]
                const data = JSON.stringify(events);
                console.log(data);
                disabled = false;
            }, minimumDisabledMs)
        }
    }
}

async function playSound(name, triggerEvent) {
    disabled = true;
    const audic = new Audic(`./sounds/${lang}/${name}.mp3`);
    audic.addEventListener('ended', () => {
        setTimeout(() => {
            disabled = false;
        }, minimumDisabledMs);
        if (triggerEvent) {
            const event = {
                name: 'tts_end',
                value: true
            };
            const events = [event]
            const data = JSON.stringify(events);
            console.log(data);
        }
    });
    await audic.play();
}

function normalizeResult(result) {
    if (lang === 'de') {
        if (result.text.startsWith('einen')) {
            result.text = result.text === 'einen' ? '' : result.text.substring(4);
        }
    }

    return result;
}

console.log(JSON.stringify([{name: 'LOG:', value: 'Start recording...'}]));
voiceRecognition.start();