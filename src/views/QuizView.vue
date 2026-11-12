<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import QuizHeader from '../components/QuizHeader.vue'
import QuestionCard from '../components/QuestionCard.vue'

import { useRoute, useRouter } from 'vue-router'
import { catalog, session } from '../stores/quiz'
const route = useRoute()
const router = useRouter()
const quiz = computed(() => catalog.quizzes.find(q => q.id === route.params.id))
const previous = session.result
const isPractice = route.query.modus === 'wiederholen' &&
  previous?.quizId === route.params.id && previous.missedIds.length > 0
const questions = (quiz.value?.questions || []).filter(
  question => !isPractice || previous.missedIds.includes(question.id)
)
const missedIds = ref([])
const nextTimer = ref(null)

const QUESTION_TIME = 20

const currentIndex = ref(0)
const score = ref(0)
const timeLeft = ref(QUESTION_TIME)
const selectedIndex = ref(null)
const locked = ref(false)
const finished = ref(false)
const timerId = ref(null)
const bestScore = ref(Number(localStorage.getItem('best-score-' + route.params.id) || 0))

const currentQuestion = computed(() => questions[currentIndex.value])

const progress = computed(() =>
  Math.round(((currentIndex.value + (finished.value ? 1 : 0)) / questions.length) * 100)
)

function startTimer() {
  clearTimer()
  timeLeft.value = QUESTION_TIME

  timerId.value = window.setInterval(() => {
    timeLeft.value -= 1

    if (timeLeft.value <= 0) {
      clearTimer()
      lockAnswer(null)
    }
  }, 1000)
}

function clearTimer() {
  if (timerId.value) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

function chooseAnswer(index) {
  if (locked.value) return
  selectedIndex.value = index
  lockAnswer(index)
}

function lockAnswer(index) {
  locked.value = true
  clearTimer()

  if (index === currentQuestion.value.correctIndex) {
    score.value += 1
  } else {
    missedIds.value.push(currentQuestion.value.id)
  }

  nextTimer.value = window.setTimeout(nextQuestion, 900)
}

function nextQuestion() {
  if (currentIndex.value < questions.length - 1) {
    currentIndex.value += 1
    selectedIndex.value = null
    locked.value = false
    startTimer()
  } else {
    finishQuiz()
  }
}

function finishQuiz() {
  finished.value = true
  clearTimer()

  if (!isPractice && score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('best-score-' + route.params.id, String(score.value))
  }

  session.result = {
    quizId: route.params.id,
    score: score.value,
    total: questions.length,
    bestScore: isPractice ? undefined : bestScore.value,
    isPractice,
    missedIds: [...missedIds.value]
  }
  router.replace('/ergebnis')
}

if (questions.length) startTimer()
onBeforeUnmount(() => { clearTimer(); window.clearTimeout(nextTimer.value) })
</script>

<template>
  <section aria-label="Quizrunde">
      <p v-if="isPractice" class="eyebrow">Wiederholungsrunde</p>
      <QuizHeader
        v-if="!finished"
        :current="currentIndex + 1"
        :total="questions.length"
        :score="score"
        :time-left="timeLeft"
        :progress="progress"
      />

      <QuestionCard
        v-if="!finished"
        :question="currentQuestion"
        :selected-index="selectedIndex"
        :locked="locked"
        @answer="chooseAnswer"
      />

  </section>
</template>
