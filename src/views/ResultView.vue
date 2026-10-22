<script setup>
import { computed } from 'vue'
import ResultScreen from '../components/ResultScreen.vue'
import { catalog, session } from '../stores/quiz'
import { useRouter } from 'vue-router'
const router = useRouter()
const quizTitle = computed(() => catalog.quizzes.find(quiz => quiz.id === session.result?.quizId)?.title || 'Deine Quizrunde')
</script>
<template>
  <template v-if="session.result">
    <p class="result-topic">{{ quizTitle }}</p>
    <ResultScreen :score="session.result.score" :total="session.result.total" :percentage="Math.round(session.result.score / session.result.total * 100)" :best-score="session.result.bestScore" @restart="router.push(`/quiz/${session.result.quizId}`)" />
  </template>
  <section v-else class="result-card"><h1>Noch kein Ergebnis</h1><p>Starte zuerst eine Quizrunde. Nach dem Neuladen ist das letzte Rundenergebnis nicht mehr verfügbar.</p><RouterLink class="primary-button start-link" to="/">Zur Quiz-Auswahl</RouterLink></section>
</template>
