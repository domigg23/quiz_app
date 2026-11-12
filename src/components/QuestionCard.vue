<script setup>
import { nextTick, ref, watch } from 'vue'
const props = defineProps({ question:Object, feedback:Object, locked:Boolean })
defineEmits(['answer'])
const heading=ref(null)
watch(()=>props.question?.id,async()=>{ await nextTick(); heading.value?.focus() },{immediate:true})
</script>
<template>
  <section v-if="question" class="question-card" aria-labelledby="question-title">
    <div class="question-topline"><span class="category">{{ question.category }} · {{ question.difficulty }}</span><span class="hint">Eine Antwort ist richtig</span></div>
    <h2 id="question-title" ref="heading" tabindex="-1">{{ question.question }}</h2>
    <div class="answers" role="group" aria-labelledby="question-title">
      <button v-for="(answer,index) in question.answers" :key="index" type="button" class="answer-button"
        :class="{ selected:feedback?.selectedIndex===index, correct:feedback && index===feedback.correctIndex,
          wrong:feedback && feedback.selectedIndex===index && !feedback.correct }"
        :aria-disabled="locked" :aria-pressed="feedback?.selectedIndex===index"
        @click="!locked && $emit('answer',index)">
        <span class="answer-letter" aria-hidden="true">{{ String.fromCharCode(65+index) }}</span>
        <span class="answer-text">{{ answer }}</span>
        <span v-if="feedback && index===feedback.correctIndex" class="answer-state">✓ Richtige Lösung</span>
      </button>
    </div>
    <div v-if="feedback" class="explanation" role="status" aria-atomic="true">
      <strong>{{ feedback.correct ? 'Richtig!' : feedback.timedOut ? 'Zeit abgelaufen.' : 'Leider falsch.' }}</strong>
      <p>Richtige Antwort: {{ question.answers[feedback.correctIndex] }}</p>
      <p>{{ feedback.explanation }}</p>
      <p class="hint">Lies die Erklärung in Ruhe und klicke dann auf Weiter.</p>
    </div>
  </section>
</template>
