<script setup>
import { computed, nextTick, ref, watch } from 'vue'
const props = defineProps({ question: Object, selectedIndex: Number, locked: Boolean })
defineEmits(['answer'])
const heading = ref(null)
const feedback = computed(() => {
  if (!props.locked) return ''
  if (props.selectedIndex === props.question.correctIndex) return 'Richtig! Ein Punkt für dich.'
  const reason = props.selectedIndex == null ? 'Zeit abgelaufen.' : 'Leider falsch.'
  return `${reason} Richtig ist: ${props.question.answers[props.question.correctIndex]}.`
})
watch(() => props.question, async () => {
  await nextTick()
  heading.value?.focus()
}, { immediate: true })
</script>
<template>
  <section v-if="question" class="question-card" aria-labelledby="question-title">
    <div class="question-topline"><span class="category">{{ question.category }}</span><span class="hint">Eine Antwort ist richtig</span></div>
    <h2 id="question-title" ref="heading" tabindex="-1">{{ question.question }}</h2>
    <div class="answers" role="group" aria-labelledby="question-title">
      <button v-for="(answer, index) in question.answers" :key="index" type="button" class="answer-button"
        :class="{ selected: selectedIndex === index, correct: locked && index === question.correctIndex, wrong: locked && selectedIndex === index && index !== question.correctIndex }"
        :aria-disabled="locked" :aria-pressed="selectedIndex === index" @click="!locked && $emit('answer', index)">
        <span class="answer-letter" aria-hidden="true">{{ String.fromCharCode(65 + index) }}</span>
        <span class="answer-text">{{ answer }}</span>
        <span v-if="locked && index === question.correctIndex" class="answer-state">✓ Richtig</span>
        <span v-else-if="locked && selectedIndex === index" class="answer-state">✕ Falsch</span>
      </button>
    </div>
    <p class="answer-feedback" role="status" aria-atomic="true">{{ feedback }}</p>
  </section>
</template>
