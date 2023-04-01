<template>
  <v-container>
    <v-row class="text-center">
      <v-col cols="12">
        <v-img
          :src="require('../assets/logo.svg')"
          class="my-3"
          contain
          height="200"
        />
      </v-col>

      <v-col class="mb-4">
        <h1 class="display-2 font-weight-bold mb-3">AI Assistant</h1>
      </v-col>

      <v-col cols="12">
        <v-btn @click="start">Start</v-btn>
        <v-btn @click="stop">stop</v-btn>
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

  data: () => ({}),
  mounted() {
    // initialise recorder
    console.log('mounted');
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(this.initMediaRecorder);
  },
  methods: {
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
  },
};
</script>
