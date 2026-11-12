import { reactive, ref } from 'vue'
import { request } from '../api'

function storedResult() {
  try {
    const value = JSON.parse(localStorage.getItem('quiz-last-result') || 'null')
    return value && typeof value.runId === 'string' && Array.isArray(value.missedIds) ? value : null
  } catch { return null }
}
export const catalog = reactive({ quizzes: [], loading:false, error:'' })
export const selectedId = ref('fussball')
export const session = reactive({ result:storedResult(), storageError:'' })
export function saveResult(result) {
  const key = `quiz-best-${result.quizId}-${result.difficulty}-${result.total}`
  let best = result.score
  try {
    best = Math.max(result.score, Number(localStorage.getItem(key)) || 0)
    if (!result.isPractice) localStorage.setItem(key, String(best))
    session.result = { ...result, bestScore:result.isPractice ? undefined : best }
    localStorage.setItem('quiz-last-result', JSON.stringify(session.result))
    session.storageError = ''
  } catch {
    session.result = { ...result, bestScore:result.isPractice ? undefined : best }
    session.storageError = 'Der Browser erlaubt kein dauerhaftes Speichern. Das Ergebnis bleibt für diese Sitzung sichtbar.'
  }
}
export async function loadQuizzes() {
  catalog.loading = true
  catalog.error = ''
  try {
    const data = await request('/api/quizzes')
    if (!Array.isArray(data) || data.some(q=>!q.id || !Array.isArray(q.questions))) throw new Error('Ungültige Quizdaten')
    catalog.quizzes = data
  } catch(error) { catalog.error = `Quizdaten konnten nicht geladen werden: ${error.message}` }
  finally { catalog.loading = false }
}
