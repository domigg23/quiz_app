<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ResultScreen from '../components/ResultScreen.vue'
import { request } from '../api'
import { session, saveResult } from '../stores/quiz'
const router=useRouter()
const loading=ref(false)
const error=ref('')
async function refresh() {
  if (!session.result?.runId) return
  loading.value=true
  error.value=''
  try { saveResult(await request(`/api/runs/${session.result.runId}/result`)) }
  catch(e) { error.value=e.message }
  finally { loading.value=false }
}
function play(practice=false) {
  router.push({path:`/quiz/${session.result.quizId}`,query:{
    schwierigkeit:session.result.difficulty,...(practice ? {modus:'wiederholen'} : {})
  }})
}
onMounted(refresh)
</script>
<template>
  <p v-if="loading" role="status">Gespeichertes Ergebnis wird geprüft …</p>
  <section v-else-if="error" role="alert" class="question-card"><p>{{ error }}</p><button class="primary-button" @click="refresh">Erneut versuchen</button><RouterLink class="secondary-link" to="/">Zur Auswahl</RouterLink></section>
  <template v-else-if="session.result">
    <p class="result-topic">{{ session.result.quizTitle }} · {{ session.result.difficulty === 'alle' ? 'Alle Schwierigkeiten' : session.result.difficulty }}</p>
    <p class="result-topic">Gespielt am {{ new Date(session.result.completedAt).toLocaleString('de-AT') }}</p>
    <p v-if="session.storageError" role="status">{{ session.storageError }}</p>
    <ResultScreen :is-practice="session.result.isPractice" :missed-count="session.result.missedIds.length"
      :score="session.result.score" :total="session.result.total"
      :percentage="Math.round(session.result.score/session.result.total*100)"
      :best-score="session.result.bestScore" @practice="play(true)" @restart="play()" />
  </template>
  <section v-else class="result-card"><h1>Noch kein Ergebnis</h1><p>Starte zuerst eine Quizrunde. Dein letztes Ergebnis bleibt danach auch beim Neuladen erhalten.</p><RouterLink class="primary-button start-link" to="/">Zur Quiz-Auswahl</RouterLink></section>
</template>
