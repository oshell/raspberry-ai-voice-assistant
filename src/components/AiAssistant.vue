<template>
  <v-container :class="['ai-assistant', status]">
    <v-row class="text-center">
      <v-col cols="12">
        <div class="system-info">
          <span v-if="temprature">
            CPU: {{ temprature }}°
          </span>
          <span>
            Time: {{ time }}
          </span>
        </div>
        <v-progress-circular class="spinner" size="70" v-if="loading" indeterminate color="#71eeff"></v-progress-circular>
        <div class="avatar">
          <v-row id="eyes">
            <v-col cols="6" class="eye">
              <div class="inner-eye left">
                <div class="pupil"></div>
              </div>
            </v-col>
            <v-col cols="6" class="eye">
              <div class="inner-eye right">
                <div class="pupil"></div>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col></v-col>
            <v-col>
              <div id="bars" :class="[status]">
                <div class="bar" v-for="index in 10" :key="index"></div>
              </div>
            </v-col>
            <v-col></v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="auto">
        <v-dialog v-model="dialog" width="auto">
          <v-card>
            <v-toolbar color="#1e2038" dark>Meme Generator</v-toolbar>
            <v-card-text>
              <img class="meme" :src="meme" />
            </v-card-text>
            <v-card-actions>
              <v-btn dark color="#1e2038" block @click="handleClose">{{ translations.thanks }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
    <span class="active-indicator top"></span>
    <span class="active-indicator right"></span>
    <span class="active-indicator bottom"></span>
    <span class="active-indicator left"></span>
  </v-container>
</template>

<script>
import { ipcRenderer } from 'electron';

let playerActive = false;
let audio = null;
const lang = 'de';

const translations = {
  en: {
    thanks: 'Thanks'
  },
  de: {
    thanks: 'Danke'
  }
}

export default {
  name: 'AiAssistant',

  data: () => ({
    status: 'inactive',
    loading: false,
    dialog: false,
    meme: null,
    temprature: null,
    translations: translations[lang],
    time: ''
  }),
  mounted() {
    ipcRenderer.on('hotword', this.handleHotwordTrigger);
    ipcRenderer.on('voice_input_start', this.handleVoiceInput);
    ipcRenderer.on('gpt_start', this.handleGptStart);
    ipcRenderer.on('tts', this.handlePlayAnswer);
    ipcRenderer.on('tts_end', this.handlePlayEnd);
    ipcRenderer.on('stop', this.handleStop);
    ipcRenderer.on('meme', this.handleMeme);
    ipcRenderer.on('meme_stop', this.handleMemeStop);
    ipcRenderer.on('cpu', this.handleCpu);
    window.addEventListener('keypress', this.handleKeyPress);
    this.showTime();
  },
  methods: {
    handleCpu(eventName, cpuCelsius) {
      this.temprature = cpuCelsius;
    },
    handleHotwordTrigger() {
      this.status = 'speaking';
    },
    handleVoiceInput() {
      this.status = 'active';
    },
    handlePlayAnswer() {
      this.loading = false;
      setTimeout(() => {
        this.status = 'speaking';
        playerActive = true;
      }, 2000);
    },
    handlePlayEnd() {
      setTimeout(() => { this.status = 'awake'; }, 200);
      setTimeout(() => { this.status = 'inactive'; }, 2000);
    },
    handleStop() {
      this.status = 'inactive';
      if (audio) {
        audio.pause();
        audio = null;
      }
    },
    handleGptStart() {
      this.status = 'thinking';
      this.loading = true;
    },
    handleKeyPress(e) {
      const num = parseInt(e.key);
      if (playerActive) return;
      if (isNaN(num)) return;
      const fileName = `sounds/${lang}/temp_${num}.mp3`;
      audio = document.createElement('audio');
      audio.setAttribute('controls', '');
      audio.src = fileName;
      audio.onended = () => {
        setTimeout(() => {
          this.status = 'inactive';
          playerActive = false;
        }, 1000)
      };

      audio.play();

      playerActive = true;
      this.status = 'speaking';
    },
    handleMeme(eventName, value) {
      this.meme = value;
      this.dialog = true;
    },
    handleMemeStop() {
      this.dialog = false;
      this.meme = null;
    },
    handleClose() {
      this.meme = null;
      this.dialog = false;
    },
    showTime() {
      const date = new Date();
      let h = date.getHours(); // 0 - 23
      let m = date.getMinutes(); // 0 - 59
      let s = date.getSeconds(); // 0 - 59
      let session = "AM";

      if (h == 0) {
        h = 12;
      }

      if (h > 12) {
        h = h - 12;
        session = "PM";
      }

      h = (h < 10) ? "0" + h : h;
      m = (m < 10) ? "0" + m : m;
      s = (s < 10) ? "0" + s : s;

      var time = h + ":" + m + ":" + s + " " + session;
      this.time = time;
      setTimeout(this.showTime, 1000);
    }
  },
};
</script>

<style lang="scss">
.ai-assistant {
  background-color: black;
  height: 100vh;

  &.active {
    .active-indicator {
      display: block;
    }
  }
}

.active {
  color: green;
}

.inactive {
  color: red;
}

.v-image.active {
  background: rgba(52, 172, 224, 1);
  box-shadow: 0 0 0 0 rgba(52, 172, 224, 1);
  animation: pulse-blue 2s infinite;
}

@keyframes pulse-blue {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(52, 172, 224, 0.7);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 30px rgba(52, 172, 224, 0);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(52, 172, 224, 0);
  }
}

.avatar {
  position: relative;
  margin: 30vh auto;
  width: 575px;
  height: 575px;

  &-img {
    height: 575px;
  }
}

.spinner {
  position: absolute;
  top: 100px;
  right: 100px;
}


#bars {
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  width: 50%;
  margin-top: 30px;

  &.active,
  &.thinking {
    margin-top: 0;
  }

  &.speaking {
    transform: translate(-50px, -40px) rotate3d(2, -2, 1, 45deg);
    margin-top: 0px;
    width: 100%;

    .bar {
      animation: sound 0ms -600ms linear infinite alternate;
    }

    .bar:nth-child(1) {
      left: 1px;
      animation-duration: 474ms;
    }

    .bar:nth-child(2) {
      left: 15px;
      animation-duration: 433ms;
    }

    .bar:nth-child(3) {
      left: 29px;
      animation-duration: 407ms;
    }

    .bar:nth-child(4) {
      left: 43px;
      animation-duration: 458ms;
    }

    .bar:nth-child(5) {
      left: 57px;
      animation-duration: 400ms;
    }

    .bar:nth-child(6) {
      left: 71px;
      animation-duration: 427ms;
    }

    .bar:nth-child(7) {
      left: 85px;
      animation-duration: 441ms;
    }

    .bar:nth-child(8) {
      left: 99px;
      animation-duration: 419ms;
    }

    .bar:nth-child(9) {
      left: 113px;
      animation-duration: 487ms;
    }

    .bar:nth-child(10) {
      left: 127px;
      animation-duration: 442ms;
    }

  }
}

.bar {
  background: rgb(113, 238, 255);
  bottom: 1px;
  height: 3px;
  width: 10px;
  margin: 0px 4px;
  border-radius: 5px;
}

@keyframes sound {
  0% {
    opacity: .35;
    height: 3px;
  }

  100% {
    opacity: 1;
    height: 70px;
  }
}

@keyframes sound {
  0% {
    opacity: .35;
    height: 3px;
  }

  100% {
    opacity: 1;
    height: 70px;
  }
}

img.meme {
  max-width: 100%;
  max-height: 600px;
}


span.active-indicator {
  position: absolute;

  display: none;

  &.top {
    top: 0;
    left: 0;
    width: 0;
    height: 20px;
    background: linear-gradient(90deg,
        transparent 50%,
        rgb(113, 238, 255),
        rgba(105, 170, 248, 0.5),
      );
    animation: animateTop 4s linear infinite;
  }

  &.bottom {
    right: 0;
    bottom: 0;
    height: 20px;
    background: linear-gradient(90deg,
        rgb(113, 238, 255),
        rgba(105, 170, 248, 0.5),
        transparent 50%);
    animation: animateBottom 4s linear infinite;
  }

  &.right {
    top: 0;
    right: 0;
    width: 20px;
    height: 0;
    background: linear-gradient(180deg,
        transparent 30%,
        rgb(113, 238, 255),
        rgba(105, 170, 248, 0.5),
      );
    animation: animateRight 4s linear infinite;
  }

  &.left {
    left: 0;
    bottom: 0;
    width: 20px;
    height: 0;
    background: linear-gradient(180deg,
        rgb(113, 238, 255),
        rgba(105, 170, 248, 0.5),
        transparent 70%);
    animation: animateLeft 4s linear infinite;
  }
}

.ai-assistant {

  &.active,
  &.speaking,
  &.thinking,
  &.awake {
    #eyes {
      .inner-eye {
        height: 150px;
        border-radius: 40%;
        width: 150px;
        transform: translateY(-65px);
        position: relative;

        .pupil {
          opacity: 1;
        }
      }
    }
  }

  &.thinking {
    #eyes {
      .inner-eye {
        .pupil {
          position: absolute;
          top: 0;
          left: 60px;
        }
      }
    }
  }
}

#eyes {
  position: relative;

  .pupil {
    transition: all 0.2s;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 30px solid #71eeff;
    position: absolute;
    top: 70px;
    left: 30px;
    opacity: 0;
  }

  .inner-eye {
    transition: all .2s ease-out;
    border: 10px solid rgb(113, 238, 255);
    height: 20px;
    width: 100px;
  }

  .eye {
    padding: 30px;
  }

  .left {
    float: right;
  }

  .right {
    float: left;
  }
}

@keyframes animateTop {
  25% {
    width: 100%;
    opacity: 1;
  }

  26%,
  100% {
    opacity: 0;
  }
}

@keyframes animateBottom {

  0%,
  50% {
    opacity: 1;
    width: 0;
  }

  75% {
    opacity: 1;
    width: 100%;
  }

  76%,
  100% {
    opacity: 0;
  }
}

@keyframes animateRight {

  0%,
  25% {
    opacity: 1;
    height: 0;
  }

  50% {
    opacity: 1;
    height: 100%;
  }

  51%,
  100% {
    height: 100%;
    opacity: 0;
  }
}

@keyframes animateLeft {
  0% {
    opacity: 0;
    height: 0%;
  }

  75% {
    opacity: 1;
    bottom: 0;
    height: 0;
  }

  100% {
    opacity: 1;
    height: 100%;
  }
}

.system-info {
  position: absolute;
  left: 10px;
  color: rgb(113, 238, 255);
  span {
    display: block;
    text-align: left;
  }
}
</style>