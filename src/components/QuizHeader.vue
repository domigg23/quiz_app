<script setup>
defineProps({ current: Number, total: Number, score: Number, timeLeft: Number, progress: Number })
</script>
<template>
  <header class="quiz-header">
    <div><p class="eyebrow">Deine Quizrunde</p><h1>Zeig, was du weißt</h1></div>
    <div class="stats">
      <div class="stat"><span class="stat-label">Frage</span><strong>{{ current }} / {{ total }}</strong></div>
      <div class="stat"><span class="stat-label">Punkte</span><strong>{{ score }}</strong></div>
      <div class="stat timer" :class="{ danger: timeLeft <= 5 }" role="timer" aria-live="off" aria-label="Verbleibende Zeit"><span class="stat-label">Zeit</span><strong>{{ timeLeft }} Sekunden</strong></div>
    </div>
    <div class="progress-track" role="progressbar" aria-label="Abgeschlossene Fragen" :aria-valuenow="progress" :aria-valuemin="0" :aria-valuemax="100"><div class="progress-bar" :style="{ width: `${progress}%` }"></div></div>
  </header>
</template>
