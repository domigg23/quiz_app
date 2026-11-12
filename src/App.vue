<script setup>
import { onMounted } from 'vue'
import { loadQuizzes } from './stores/quiz'
onMounted(loadQuizzes)
</script>
<template>
  <main class="app-shell"><div class="quiz-layout">
    <nav class="navigation"><RouterLink to="/">Quiz</RouterLink><div class="nav-links"><RouterLink to="/">Quiz-Auswahl</RouterLink><RouterLink to="/ergebnis">Letztes Ergebnis</RouterLink></div></nav>
    <RouterView :key="$route.fullPath" />
    <footer>Vue-Quiz · Teamprojekt</footer>
  </div></main>
</template>
