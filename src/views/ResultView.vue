<script setup>
import ResultScreen from '../components/ResultScreen.vue'
import { session } from '../stores/quiz'
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
<template>
  <ResultScreen v-if="session.result" :score="session.result.score" :total="session.result.total" :percentage="Math.round(session.result.score / session.result.total * 100)" :best-score="session.result.bestScore" @restart="router.push(`/quiz/${session.result.quizId}`)" />
  <section v-else class="result-card"><h1>Noch kein Ergebnis</h1><p>Starte zuerst eine Quizrunde.</p><RouterLink to="/">Zur Quiz-Auswahl</RouterLink></section>
</template>
