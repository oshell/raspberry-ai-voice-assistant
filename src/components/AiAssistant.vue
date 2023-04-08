<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <div class="avatar">
          <div id="bars" v-if="status === 'speaking'">
            <div class="bar" v-for="index in 10" :key="index"></div>
          </div>
          <v-img :src="require('../assets/cyborg_corgi.webp')" :class="[status, 'my-3', 'avatar-img']" contain height="800" />
          <v-progress-circular class="spinner" size="70" v-if="loading" indeterminate color="amber"></v-progress-circular>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ipcRenderer } from 'electron';

let playerActive = false;

export default {
  name: 'AiAssistant',

  data: () => ({
    status: 'inactive',
    loading: false
  }),
  mounted() {
    ipcRenderer.on('hotword', this.handleHotwordTrigger);
    ipcRenderer.on('voice_input_start', this.handleVoiceInput);
    ipcRenderer.on('gpt_start', this.handleGptStart);
    ipcRenderer.on('tts', this.handlePlayAnswer);
    ipcRenderer.on('tts_end', this.handlePlayEnd);
    window.addEventListener('keypress', this.handleKeyPress);
  },
  methods: {
    handleHotwordTrigger() {
      this.status = 'speaking';
    },
    handleVoiceInput() {
      this.status = 'active';
    },
    handlePlayAnswer() {
      this.loading = false;
      this.status = 'speaking';
    },
    handlePlayEnd() {
      this.status = 'inactive';
    },
    handleGptStart() {
      this.status = 'inactive';
      this.loading = true;
    },
    handleKeyPress(e) {
      const num = parseInt(e.key);
      if (playerActive) return;
      if (isNaN(num)) return;
      console.log('play');
      const fileName = `sounds/temp_${num}.mp3`;
      const audio = document.createElement('audio');
      audio.setAttribute('controls', '');
      audio.src = fileName;
      audio.onended = () => {
        this.status = 'inactive';
        playerActive = false;
      };
      
      audio.play();
      playerActive = true;
      this.status = 'speaking';
    }
  },
};
</script>

<style lang="scss">
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
  margin: 0 auto;
  width: 575px;
  height: 800px;
  &-img {
    height: 800px;
  }
}

.spinner {
  position: absolute;
  bottom: 30px;
  right: 30px;
}


#bars {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 10%;
  z-index: 1;
  width: 100%;
}

.bar {
  background: #b9af2c;
  bottom: 1px;
  height: 3px;
  width: 10px;
  margin: 0px 4px;
  border-radius: 5px;
  animation: sound 0ms -600ms linear infinite alternate;
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
}</style>