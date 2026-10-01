<script setup>
defineProps({
  question: Object,
  selectedIndex: Number,
  locked: Boolean
})

defineEmits(['answer'])
</script>

<template>
  <section class="question-card">
    <div class="question-topline">
      <span class="category">{{ question.category }}</span>
      <span class="hint">Wähle eine Antwort</span>
    </div>

    <h2>{{ question.question }}</h2>

    <div class="answers">
      <button
        v-for="(answer, index) in question.answers"
        :key="answer"
        class="answer-button"
        :class="{
          selected: selectedIndex === index,
          correct: locked && index === question.correctIndex,
          wrong: locked && selectedIndex === index && index !== question.correctIndex
        }"
        :disabled="locked"
        @click="$emit('answer', index)"
      >
        <span class="answer-letter">{{ String.fromCharCode(65 + index) }}</span>
        <span>{{ answer }}</span>
      </button>
    </div>
  </section>
</template>
