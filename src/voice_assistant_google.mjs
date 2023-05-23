import fs from 'fs';
import 'isomorphic-fetch';
import util from "util";
import dotenv from "dotenv";
import { ChatGPTAPI } from 'chatgpt';
import textToSpeech from "@google-cloud/text-to-speech";
import Audic from 'audic';
import getMP3Duration from 'get-mp3-duration';
import config from '../assistant_config.mjs';
import startGoogleSpeechToText from './google_stt.mjs';

dotenv.config();

const lang = config.language;
const answerWordLimit = config.answerWordLimit;
const assistantName = config.assistantName;
const memeTrigger = config.memeTrigger;
const systemMessage = config.gptSystemMessage;

let lastRequestId = null;
const eventTimeoutMs = 500;
const debug = false;

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

let active = false;
let disabled = false;
const minimumDisabledMs = 5000;

const voiceRecognition = {
    hotwords: {
        activate: [],
        activateMeme: ''
    },
    initHotwords: () => {
        const prefixes = ['hey ', 'he ', 'the ', 'hi ', '']
        voiceRecognition.hotwords.activate = prefixes.map(prefix => {
            return `${prefix}${assistantName.toLocaleLowerCase()}`;
        });
        voiceRecognition.hotwords.activateMeme = memeTrigger;
    },
    googleSttCallback: (text) => {
        if (text && debug) {
            triggerEvent('google_stt_debug', text);
            return;
        }
        voiceRecognition.checkHotword(text);
        voiceRecognition.handleInput(text);
        voiceRecognition.checkStop(text);
    },
    start: () => {
        voiceRecognition.initHotwords();
        const googleLang = languageMapping[lang];
        startGoogleSpeechToText(voiceRecognition.googleSttCallback, googleLang);
    },
    handleInput: async (text) => {
        if (!active || disabled) return;
        if (text.includes('stop') && text.length <= 10) {
            triggerEvent('stop', true);
            active = false;
            return;
        }

        text = text.trim();
        let inputTooShort = text && text.length < 6;
        let notEnoughWords = text.split(' ').length < 3;
        let containsHotWord = text.includes(assistantName) && text.legth < 12;
        if (!text || inputTooShort || notEnoughWords || containsHotWord) {
            return;
        }

        if (text.includes('stop') && text.length <= 20) {
            triggerEvent('stop', true);
            active = false;
            return;
        }

        let questionEvent = {
            name: 'question',
            value: text
        };

        const gptStartEvent = {
            name: 'gpt_start',
            value: true
        };

        let events = [questionEvent, gptStartEvent];
        let data = JSON.stringify(events);
        console.log(data);
        active = false;

        const answer = await askChatGpt(text);

        triggerEvent('answer', answer);
        await synthesizeSpeech(answer);
        triggerEvent('tts', true);
        playSound('gpt_answer', true);

    },
    checkHotword: async (text) => {
        if (active || disabled) return;

        text = normalizeResult(text);
        let match = false;
        voiceRecognition.hotwords.activate.forEach(hotword => {
            if (text.includes(hotword)) {
                match = true;
            }
        });

        if (match) {
            active = true;
            setTimeout(() => {
                disabled = false;
            }, eventTimeoutMs);
            triggerEvent('voice_input_start', true);
        }

        let memeMatch = false;
        if (text.includes(voiceRecognition.hotwords.activateMeme)) {
            memeMatch = true;
        }

        if (memeMatch) {
            memeLoop = true;
            disabled = true;
            triggerEvent('meme_hotword', true);
            fetchMeme();
            playSound('meme_hotword_answer', false);
            setTimeout(() => {
                disabled = false;
            }, minimumDisabledMs)
        }

        let memeContinueMatch = text.includes(continueMatches[lang]);

        if (memeContinueMatch && memeLoop) {
            disabled = true;
            triggerEvent('meme', true);
            fetchMeme();
            setTimeout(() => {
                disabled = false;
            }, 1000);
        }

        let stopMatch = text.includes('stop');

        if (stopMatch && memeLoop) {
            memeLoop = false;
            triggerEvent('meme_stop', true);
        }
    },
    checkStop: async (text) => {
        if (!disabled) return;
        text = normalizeResult(text);
        let match = false;
        if (text.includes('stop')) {
            match = true;
        }

        if (match) {
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

function normalizeResult(text) {
    text = text.trim();
    return text.toLocaleLowerCase();
}

console.log(JSON.stringify([{ name: 'LOG:', value: 'Google Speech-to-Text started!' }]));
voiceRecognition.start();
