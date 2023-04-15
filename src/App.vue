<template>
  <v-app>
    <v-app-bar
      app
      color="#1e2038"
      dark
    >
      Corgi AI
    </v-app-bar>

    <v-main class="main-container">
      <AiAssistant />
    </v-main>
  </v-app>
</template>

<script>
import AiAssistant from './components/AiAssistant';

export default {
  name: 'App',

  components: {
    AiAssistant,
  },

  data: () => ({
    //
  }),
};
</script>

<style>
.main-container {
  background-color: #2f324d;
}
</style>