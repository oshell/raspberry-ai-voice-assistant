import fs from 'fs';
import util from "util";
import dotenv from "dotenv";
import textToSpeech from "@google-cloud/text-to-speech";

dotenv.config();

const ttsApi = new textToSpeech.TextToSpeechClient();

const languageMapping = {
    en: 'en-US',
    de: 'de-DE'
}

const voices = {
    de: 'de-DE-Neural2-B',//A,C,D
    en: 'en-US-Neural2-I'//A,D,I
}

async function synthesizeSpeech(text, name, lang) {
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
    await writeFile(`./sounds/${lang}/${name}.mp3`, response.audioContent, 'binary');
    console.log('Done!');
}

async function listVoices(lang) {
    const [result] = await ttsApi.listVoices({});
    const voices = result.voices;

    console.log('Voices:');
    voices.forEach(voice => {
        if (!voice.name.includes('Neural')) return;
        if (!voice.languageCodes.includes(languageMapping[lang])) return;
        console.log(`Name: ${voice.name}`);
        console.log(`  SSML Voice Gender: ${voice.ssmlGender}`);
        console.log(`  Natural Sample Rate Hertz: ${voice.naturalSampleRateHertz}`);
        console.log('  Supported languages:');
        voice.languageCodes.forEach(languageCode => {
            console.log(`    ${languageCode}`);
        });
    });
}

const text = "Spiel 'Die da', von den Fantastischen Vier";
const name = 'temp_4';
const lang = 'de';

synthesizeSpeech(text, name, lang);
