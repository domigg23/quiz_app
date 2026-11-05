<script setup>
import { computed, ref, watch } from 'vue'
import { catalog, selectedId, loadQuizzes } from '../stores/quiz'

const search = ref('')
const category = ref('')
const categories = computed(() => [...new Set(catalog.quizzes.map(quiz => quiz.category))].sort())
const filteredQuizzes = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('de')
  return catalog.quizzes.filter(quiz =>
    (!category.value || quiz.category === category.value) &&
    `${quiz.title} ${quiz.category} ${quiz.description}`.toLocaleLowerCase('de').includes(term)
  )
})
const selected = computed(() => filteredQuizzes.value.find(quiz => quiz.id === selectedId.value))
// Keep the detail panel inside the visible selection, including after loading/filtering.
watch(filteredQuizzes, quizzes => {
  if (!quizzes.some(quiz => quiz.id === selectedId.value)) selectedId.value = quizzes[0]?.id ?? ''
}, { immediate: true })
function resetFilters() {
  search.value = ''
  category.value = ''
}
</script>

<template>
  <header class="catalog-heading">
    <p class="eyebrow">Wissen trainieren</p>
    <h1>Deine nächste Quizrunde</h1>
    <p>Entdecke ein Thema, teste dein Wissen und verbessere deinen Bestwert.</p>
  </header>
  <p v-if="catalog.loading" role="status">Quizdaten werden geladen …</p>
  <section v-else-if="catalog.error" role="alert" class="question-card">
    <h2>Die Themen fehlen noch</h2><p>{{ catalog.error }}</p>
    <button class="primary-button" @click="loadQuizzes">Erneut versuchen</button>
  </section>
  <template v-else>
    <div class="catalog-filters">
      <label for="quiz-search">Thema suchen
        <input id="quiz-search" v-model="search" type="search" placeholder="Titel, Kategorie oder Beschreibung" />
      </label>
      <label for="quiz-category">Kategorie
        <select id="quiz-category" v-model="category">
          <option value="">Alle Kategorien</option>
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
    </div>
    <p class="catalog-count" role="status">{{ filteredQuizzes.length }} von {{ catalog.quizzes.length }} Themen</p>
    <div v-if="filteredQuizzes.length" class="master-detail">
      <aside aria-label="Quizthemen">
        <button v-for="quiz in filteredQuizzes" :key="quiz.id" class="topic-button"
          :class="{ active: selected?.id === quiz.id }" :aria-pressed="selected?.id === quiz.id"
          aria-controls="quiz-detail" @click="selectedId = quiz.id">
          <span class="eyebrow">{{ quiz.category }}</span>
          <strong>{{ quiz.title }}</strong><span>{{ quiz.questions.length }} Fragen</span>
        </button>
      </aside>
      <section v-if="selected" id="quiz-detail" class="question-card quiz-detail" aria-labelledby="detail-title">
        <p class="eyebrow">{{ selected.category }}</p><h2 id="detail-title">{{ selected.title }}</h2>
        <p>{{ selected.description }}</p>
        <dl class="quiz-facts"><div><dt>Umfang</dt><dd>{{ selected.questions.length }} Fragen</dd></div><div><dt>Zeitlimit</dt><dd>20 Sekunden je Frage</dd></div></dl>
        <p class="hint">Pro Frage ist eine Antwort richtig. Für jede richtige Antwort erhältst du einen Punkt.</p>
        <RouterLink class="primary-button start-link" :to="`/quiz/${selected.id}`">{{ selected.title }} starten →</RouterLink>
      </section>
    </div>
    <section v-else class="question-card empty-state">
      <h2>Keine passenden Themen</h2><p>Versuche einen anderen Suchbegriff oder wähle eine andere Kategorie.</p>
      <button class="primary-button" @click="resetFilters">Filter zurücksetzen</button>
    </section>
  </template>
</template>
