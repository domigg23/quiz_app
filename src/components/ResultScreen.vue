<script setup>
import { onMounted, ref } from 'vue'
defineProps({ score: Number, total: Number, percentage: Number, bestScore: Number })
defineEmits(['restart'])
const heading = ref(null)
onMounted(() => heading.value?.focus())
</script>
<template>
  <section class="result-card" aria-labelledby="result-title">
    <p class="eyebrow">Geschafft</p><h2 id="result-title" ref="heading" tabindex="-1">Dein Ergebnis</h2>
    <div class="score-circle"><strong>{{ percentage }}%</strong><span>{{ score }} von {{ total }} richtig</span></div>
    <p v-if="percentage >= 80" class="result-message">Sehr stark – du hast den Großteil richtig beantwortet.</p>
    <p v-else-if="percentage >= 50" class="result-message">Solide Runde – mit etwas Übung geht noch mehr.</p>
    <p v-else class="result-message">Jede Runde bringt Übung. Probiere es gleich noch einmal!</p>
    <p class="best-score">Dein Bestwert: <strong>{{ bestScore }} / {{ total }}</strong></p>
    <div class="result-actions"><button class="primary-button" @click="$emit('restart')">Quiz neu starten</button><RouterLink class="secondary-link" to="/">Anderes Thema wählen</RouterLink></div>
  </section>
</template>
