<script setup>
import { onMounted } from 'vue'
import { loadQuizzes } from './stores/quiz'
onMounted(loadQuizzes)
</script>
<template>
  <main class="app-shell"><div class="quiz-layout">
    <nav class="navigation"><RouterLink to="/">Quiz</RouterLink><RouterLink to="/">Quiz-Auswahl</RouterLink></nav>
    <RouterView :key="$route.fullPath" />
    <footer>Vue-Quiz · Teamprojekt</footer>
  </div></main>
</template>
