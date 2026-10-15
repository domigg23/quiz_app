<script setup>
import { computed } from 'vue'
import { catalog, selectedId, loadQuizzes } from '../stores/quiz'
const selected = computed(() => catalog.quizzes.find(q => q.id === selectedId.value) || catalog.quizzes[0])
</script>
<template>
  <header><p class="eyebrow">Wissen trainieren</p><h1>Dein Sportquiz</h1><p>Wähle ein Sportthema und entdecke die Details. Pro Frage hast du 20 Sekunden.</p></header>
  <p v-if="catalog.loading" role="status">Quizdaten werden geladen …</p>
  <section v-else-if="catalog.error" role="alert"><p>{{ catalog.error }}</p><button class="primary-button" @click="loadQuizzes">Erneut versuchen</button></section>
  <div v-else class="master-detail">
    <aside aria-label="Quizthemen"><button v-for="quiz in catalog.quizzes" :key="quiz.id" class="topic-button" :class="{ active: selected?.id === quiz.id }" :aria-pressed="selected?.id === quiz.id" @click="selectedId = quiz.id"><strong>{{ quiz.title }}</strong><span>{{ quiz.questions.length }} Fragen</span></button></aside>
    <section v-if="selected" class="question-card"><p class="eyebrow">{{ selected.category }}</p><h2>{{ selected.title }}</h2><p>{{ selected.description }}</p><p>{{ selected.questions.length }} Fragen · 20 Sekunden je Frage</p><RouterLink class="primary-button start-link" :to="`/quiz/${selected.id}`">Quiz starten →</RouterLink></section>
  </div>
</template>
