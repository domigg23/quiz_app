<script setup>
defineProps({
  score: Number,
  total: Number,
  percentage: Number,
  bestScore: Number
})

defineEmits(['restart'])
</script>

<template>
  <section class="result-card">
    <p class="eyebrow">Geschafft</p>
    <h2>Dein Ergebnis</h2>

    <div class="score-circle">
      <strong>{{ percentage }}%</strong>
      <span>{{ score }} von {{ total }} richtig</span>
    </div>

    <p v-if="percentage >= 80" class="result-message">
      Sehr stark – du hast den Großteil richtig beantwortet.
    </p>
    <p v-else-if="percentage >= 50" class="result-message">
      Solide Runde – mit etwas Übung geht noch mehr.
    </p>
    <p v-else class="result-message">
      Noch Luft nach oben – starte einfach eine neue Runde.
    </p>

    <p class="best-score">Bestes Ergebnis: {{ bestScore }} / {{ total }}</p>

    <button class="primary-button" @click="$emit('restart')">
      Quiz neu starten
    </button>
  </section>
</template>
