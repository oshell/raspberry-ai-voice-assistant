<template>
  <v-app>
    <v-app-bar
      app
      color="primary"
      dark
    >
      Corgi AI
    </v-app-bar>

    <v-main>
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
