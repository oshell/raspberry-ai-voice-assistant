<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <div class="avatar" >
            <v-img :src="require('../assets/cyborg_corgi.webp')" :class="[status, 'my-3']" contain height="500" />
            <v-progress-circular class="spinner" size="70" v-if="loading" indeterminate color="amber"></v-progress-circular>
          </div>
      </v-col>

      <v-col class="mb-4">
        <p>Status: <span :class="status">{{ status }}</span></p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ipcRenderer } from 'electron';
let mediaRecorder;
let audioChunks = [];

export default {
  name: 'AiAssistant',

  data: () => ({
    status: 'inactive',
    loading: false
  }),
  mounted() {
    // initialise recorder
    console.log('mounted');
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.initMediaRecorder);
    ipcRenderer.on('hotword-trigger', this.handleHotwordTrigger);
    ipcRenderer.on('answer-trigger', this.playAnswer);
    ipcRenderer.on('recording-trigger', this.handleRecording);
  },
  methods: {
    handleHotwordTrigger() {
      this.status = 'active';
      this.playHotwordAnswer();
    },
    initMediaRecorder(stream) {
      console.log('init recorder');
      navigator.permissions.query({ name: 'microphone' });
      const options = { mimeType: 'audio/webm' };
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.addEventListener('dataavailable', this.onDataInput);
      mediaRecorder.addEventListener('onstop', this.handleStop);
    },
    start() {
      console.log('start');
      mediaRecorder.start();
    },
    stop() {
      console.log('stop');
      mediaRecorder.stop();
    },
    handleStop() {
      const audioBlob = new Blob(audioChunks, {
        type: 'audio/ogg; codecs=opus',
      });

      const audio = document.createElement('audio');
      audio.setAttribute('controls', '');
      const audioURL = window.URL.createObjectURL(audioBlob);
      audio.src = audioURL;
      audio.play();

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = function () {
        var base64data = reader.result;
        console.log(base64data);
        ipcRenderer.send('audio_input', base64data);
      };
    },
    onDataInput(e) {
      console.log('data');
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }

      this.handleStop();
    },
    playHotwordAnswer() {
      const audio = document.createElement('audio');
      audio.setAttribute('controls', '');
      const audioURL = "./sounds/hotword_answer_1.mp3";
      audio.src = audioURL;
      audio.play();
    },
    playAnswer() {
      this.loading = false;
      const audio = document.createElement('audio');
      audio.setAttribute('controls', '');
      const audioURL = "./sounds/gpt_answer.mp3";
      audio.src = audioURL;
      audio.play();
      setTimeout(() => {
        this.status = 'inactive';
      }, 3000)
    },
    handleRecording() {
      this.active = false;
      this.loading = true;
    }
  },
};
</script>

<style>
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
  width: 355px;
}

.spinner {
  position: absolute;
    bottom: 30px;
    right: 30px;
}
</style>