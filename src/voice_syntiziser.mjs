import 'isomorphic-fetch';
import fs from "fs";
import util from "util";
import dotenv from "dotenv";
import { ChatGPTAPI } from 'chatgpt';
import textToSpeech from "@google-cloud/text-to-speech";

dotenv.config();
console.log(process.env.OPEN_AI_APIKEY );
const chatGPTAPI = new ChatGPTAPI({ apiKey: process.env.OPEN_AI_APIKEY })
const ttsApi = new textToSpeech.TextToSpeechClient();

async function synthesizeSpeech(text) {
    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await ttsApi.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile('./public/sounds/gpt_answer.mp3', response.audioContent, 'binary');
    console.log('Audio content written to file: output.mp3');
}

async function askChatGpt(message) {
    const response = await chatGPTAPI.sendMessage(message);
    return response.text;
}

const latestRecordingFile = 'latest_recording.txt';

async function handleQuestion(question) {
    if (question.substring(0, 4) === "the ") {
      question = question.substring(4);
    }
    if (question.includes('hey there how can i help')) {
        console.log("ERR: recorded question.");
        return;
    }
    console.log(`question: ${question}`);
    const answer = await askChatGpt(question);
    console.log(`answer: ${answer}`);
    await synthesizeSpeech(answer);
}

fs.watchFile(latestRecordingFile, (curr, prev) => {
  let question = fs.readFileSync(latestRecordingFile, "utf8");
    handleQuestion(question);
});