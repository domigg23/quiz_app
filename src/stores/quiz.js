import { reactive, ref } from 'vue'
export const catalog = reactive({ quizzes: [], loading: false, error: '' })
export const selectedId = ref('fussball')
export const session = reactive({ result: null })
export async function loadQuizzes() {
  catalog.loading = true
  catalog.error = ''
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/quizzes.json`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    if (!Array.isArray(data) || !data.length || data.some(q => !q.id || !q.title || !Array.isArray(q.questions) || !q.questions.length || q.questions.some(x => !x.question || !Array.isArray(x.answers) || x.answers.length < 2 || !Number.isInteger(x.correctIndex) || x.correctIndex < 0 || x.correctIndex >= x.answers.length))) throw new Error('Ungültige Quizdaten')
    catalog.quizzes = data
  } catch (error) {
    catalog.error = `Quizdaten konnten nicht geladen werden: ${error.message}`
  } finally { catalog.loading = false }
}
