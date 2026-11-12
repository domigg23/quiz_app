import { createRouter, createWebHashHistory } from 'vue-router'
import CatalogView from './views/CatalogView.vue'
import QuizView from './views/QuizView.vue'
import ResultView from './views/ResultView.vue'
import { catalog, loadQuizzes } from './stores/quiz'
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: CatalogView },
    { path: '/quiz/:id', component: QuizView, beforeEnter: async to => {
      if (!catalog.quizzes.length) await loadQuizzes()
      if (!catalog.quizzes.some(q => q.id === to.params.id)) return '/'
    } },
    { path: '/ergebnis', component: ResultView },
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ]
})
export default router
