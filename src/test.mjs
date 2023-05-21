import fs from 'fs';
import Audic from 'audic';
import getMP3Duration from 'get-mp3-duration';
const lang = 'en';


function triggerEvent(name, value) {
    const event = { name, value };
    const events = [event];
    const data = JSON.stringify(events);
    console.log(data);
}


async function playSound(name) {
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
            triggerEvent('tts_end', true);
            process.exit();
        }, duration);
    });
    audic.play();
}

playSound('hotword_answer_1')