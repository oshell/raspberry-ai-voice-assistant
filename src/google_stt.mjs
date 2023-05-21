import recorder from 'node-record-lpcm16';
import speech from '@google-cloud/speech';

// Creates a client
const client = new speech.SpeechClient();

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  },
  interimResults: false, // If you want interim results, set this to true
};

let callback = (result) => {
  console.log('result');
  console.log(result);
}
// Create a recognize stream
const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data => {
    const success = data.results[0] && data.results[0].alternatives[0];
    if (success) {
      const result = data.results[0].alternatives[0].transcript;
      callback(result);
    }
  });


function startGoogleSpeechToText(func) {
  callback = func;
  // Start recording and send the microphone input to the Speech API.
  // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
  recorder
    .record({
      sampleRateHertz: sampleRateHertz,
      threshold: 0,
      verbose: false,
      recordProgram: 'rec', // Try also "arecord" or "sox"
      silence: '1.0',
    })
    .stream()
    .on('error', console.error)
    .pipe(recognizeStream);
}

export default startGoogleSpeechToText;
