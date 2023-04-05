var vosk = require('vosk')

const fs = require("fs");
const mic = require("mic");

const MODEL_PATH = __dirname + "/../language_models/vosk-model-en-us-0.22"
const SAMPLE_RATE = 16000

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

var micInstance = mic({
    rate: String(SAMPLE_RATE),
    channels: '1',
    debug: false,
    device: 'default',
});


let active = false;

const voiceRecognition = {
    hotwords: [
        'hey buddy',
        'the buddy',
    ],
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
    handleInput: (data) => {
        if (!active) return;
        if (rec.acceptWaveform(data)) {
            const result = rec.result();
            console.log(result.text);
            if (result.text.length < 4) {
                return;
            }
            fs.writeFile('latest_recording.txt', result.text, (err) => {
                err && console.log(err);
                active = false;
            })
        }
    },
    checkHotword: (data) => {
        if (active) return;
        if (rec.acceptWaveform(data)) {
            const result = rec.result();
            let match = false;
            voiceRecognition.hotwords.forEach(hotword => {
                if (result.text.includes(hotword)) {
                    match = true;
                }
            });
            if (match) {
                console.log("activated");
                active = true;
                fs.writeFile('hotword_trigger.txt', Date.now().toString(), (err) => {
                    err && console.log(err);
                })
            }
        }
    }
}

voiceRecognition.start();