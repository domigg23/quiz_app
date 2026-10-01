<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import QuizHeader from '../components/QuizHeader.vue'
import QuestionCard from '../components/QuestionCard.vue'
import ResultScreen from '../components/ResultScreen.vue'
import { computed as vueComputed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catalog, session } from '../stores/quiz'
const route = useRoute()
const router = useRouter()
const quiz = vueComputed(() => catalog.quizzes.find(q => q.id === route.params.id))
const questions = quiz.value?.questions || []
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

const percentage = computed(() =>
  Math.round((score.value / questions.length) * 100)
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
  session.result = { quizId: route.params.id, score: score.value, total: questions.length, bestScore: Math.max(score.value, bestScore.value) }
  finished.value = true
  router.replace('/ergebnis')
  clearTimer()

  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('best-score-' + route.params.id, String(score.value))
  }
}

function restartQuiz() {
  currentIndex.value = 0
  score.value = 0
  selectedIndex.value = null
  locked.value = false
  finished.value = false
  startTimer()
}

if (questions.length) startTimer()
onBeforeUnmount(() => { clearTimer(); window.clearTimeout(nextTimer.value) })
</script>

<template>
  <main class="app-shell">
    <div class="background-orb orb-one"></div>
    <div class="background-orb orb-two"></div>

    <div class="quiz-layout">
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

      <ResultScreen
        v-else
        :score="score"
        :total="questions.length"
        :percentage="percentage"
        :best-score="bestScore"
        @restart="restartQuiz"
      />

      <footer>
        
      </footer>
    </div>
  </main>
</template>



