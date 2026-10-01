<script setup>
defineProps({
  current: Number,
  total: Number,
  score: Number,
  timeLeft: Number,
  progress: Number
})
</script>

<template>
  <header class="quiz-header">
    <div>
      <p class="eyebrow">quiz+</p>
      <h1>Quiz Challenge</h1>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-label">Frage</span>
        <strong>{{ current }} / {{ total }}</strong>
      </div>
      <div class="stat">
        <span class="stat-label">Punkte</span>
        <strong>{{ score }}</strong>
      </div>
      <div class="stat timer" :class="{ danger: timeLeft <= 5 }">
        <span class="stat-label">Zeit</span>
        <strong>{{ timeLeft }}s</strong>
      </div>
    </div>

    <div class="progress-track" aria-label="Quiz-Fortschritt">
      <div class="progress-bar" :style="{ width: `${progress}%` }"></div>
    </div>
  </header>
</template>
