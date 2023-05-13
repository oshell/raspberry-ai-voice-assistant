<template>
  <v-app>
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
  background-color: black;
}
</style>