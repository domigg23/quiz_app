<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuizHeader from '../components/QuizHeader.vue'
import QuestionCard from '../components/QuestionCard.vue'
import { request } from '../api'
import { session, saveResult } from '../stores/quiz'

const route = useRoute()
const router = useRouter()
const round = ref(null)
const busy = ref(false)
const error = ref('')
const timeLeft = ref(20)
const retryAction = ref('answer')
let interval
let deadline
let disposed = false
const feedback = computed(()=>round.value?.feedback)
function stopTimer() { clearInterval(interval) }
function startTimer() {
  stopTimer()
  deadline = Date.now() + round.value.remainingMs
  function tick() {
    timeLeft.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (timeLeft.value === 0) { stopTimer(); answer(null) }
  }
  interval = setInterval(tick, 200)
  tick()
}
async function start() {
  busy.value = true
  error.value = ''
  retryAction.value = 'start'
  try {
    const source = route.query.modus==='wiederholen' ? session.result?.runId : undefined
    if (route.query.modus==='wiederholen' && !source) throw new Error('Keine gespeicherte Runde zum Wiederholen vorhanden.')
    const data = await request('/api/runs', {
      method:'POST', body:JSON.stringify({
        quizId:route.params.id, difficulty:route.query.schwierigkeit || 'alle', sourceRunId:source
      })
    })
    if (disposed) return
    round.value=data
    busy.value=false
    startTimer()
  } catch(e) { if (!disposed) error.value=e.message }
  finally { busy.value=false }
}
const pendingIndex = ref(null)
async function answer(index) {
  if (busy.value || feedback.value || disposed) return
  stopTimer()
  pendingIndex.value=index
  busy.value=true
  error.value=''
  retryAction.value='answer'
  try {
    const data=await request(`/api/runs/${round.value.runId}/answer`, {
      method:'POST', body:JSON.stringify({ questionId:round.value.question.id, answerIndex:index })
    })
    if (!disposed) round.value=data
  } catch(e) { if (!disposed) error.value=e.message }
  finally { busy.value=false }
}
async function next() {
  if (busy.value) return
  busy.value=true
  error.value=''
  retryAction.value='next'
  try {
    const data=await request(`/api/runs/${round.value.runId}/next`, {
      method:'POST', body:JSON.stringify({questionId:round.value.question.id})
    })
    if (disposed) return
    if (data.completed) {
      const result=await request(`/api/runs/${data.runId}/result`)
      if (disposed) return
      saveResult(result)
      await router.replace('/ergebnis')
    } else {
      round.value=data
      busy.value=false
      startTimer()
    }
  } catch(e) { if (!disposed) error.value=e.message }
  finally { busy.value=false }
}
function retry() {
  if (retryAction.value==='start') start()
  else if (retryAction.value==='next') next()
  else answer(pendingIndex.value)
}
onMounted(start)
onBeforeUnmount(()=>{ disposed=true; stopTimer() })
</script>
<template>
  <section aria-label="Quizrunde">
    <p v-if="!round && busy" role="status">Zufallsrunde wird vorbereitet …</p>
    <p v-if="round?.isPractice" class="eyebrow">Wiederholungsrunde</p>
    <div v-if="error" class="question-card" role="alert">
      <p>{{ error }}</p><button class="primary-button" :disabled="busy" @click="retry">Erneut versuchen</button>
      <RouterLink class="secondary-link" to="/">Zur Auswahl</RouterLink>
    </div>
    <template v-if="round">
      <QuizHeader :current="round.current" :total="round.total" :score="round.score" :time-left="timeLeft"
        :progress="Math.round(((round.current - 1 + (feedback ? 1 : 0)) / round.total) * 100)" />
      <QuestionCard :question="round.question" :feedback="feedback" :locked="busy || !!feedback || !!error"
        @answer="answer" />
      <p v-if="busy" role="status">Wird vom Server verarbeitet …</p>
      <button v-if="feedback" class="primary-button" :disabled="busy" @click="next">
        {{ round.current === round.total ? 'Ergebnis anzeigen' : 'Nächste Frage' }}
      </button>
    </template>
  </section>
</template>
