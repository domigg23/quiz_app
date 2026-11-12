<script setup>
import { computed, reactive, ref } from 'vue'
import { request } from '../api'
import { loadQuizzes } from '../stores/quiz'
const key=ref('')
const authorized=ref(false)
const quizzes=ref([])
const busy=ref(false)
const error=ref('')
const success=ref('')
const editId=ref(null)
const form=reactive({quizId:'',category:'',question:'',answers:['','','',''],correctIndex:0,explanation:'',difficulty:'mittel'})
const questions=computed(()=>quizzes.value.find(q=>q.id===form.quizId)?.questions || [])
const headers=()=>({Authorization:`Bearer ${key.value.trim()}`})
async function unlock() {
  error.value=''
  busy.value=true
  try {
    quizzes.value=await request('/api/editor/questions',{headers:headers()})
    authorized.value=true
    reset()
  } catch(e){ error.value=e.message }
  finally{ busy.value=false }
}
function reset() {
  editId.value=null
  Object.assign(form,{quizId:form.quizId || quizzes.value[0]?.id || '',category:'',question:'',
    answers:['','','',''],correctIndex:0,explanation:'',difficulty:'mittel'})
  form.category=quizzes.value.find(q=>q.id===form.quizId)?.category || ''
  success.value=''
}
function edit(question) {
  editId.value=question.id
  Object.assign(form,{...question,answers:[...question.answers]})
  error.value=''
  success.value=''
}
function changeQuiz() { reset() }
async function save() {
  busy.value=true
  error.value=''
  success.value=''
  try {
    const path='/api/editor/questions'+(editId.value===null ? '' : '/'+editId.value)
    await request(path,{method:editId.value===null?'POST':'PUT',headers:headers(),body:JSON.stringify(form)})
    quizzes.value=await request('/api/editor/questions',{headers:headers()})
    await loadQuizzes()
    reset()
    success.value='Frage in der Datenbank gespeichert. Sie erscheint in neuen Quizrunden.'
  } catch(e){ error.value=e.message }
  finally{ busy.value=false }
}
function lock() {
  key.value=''
  quizzes.value=[]
  authorized.value=false
  reset()
}
</script>
<template>
  <section class="question-card">
    <p class="eyebrow">Fragen verwalten</p><h1>Frageneditor</h1>
    <form v-if="!authorized" class="editor-form" @submit.prevent="unlock">
      <p>Der Editor ist nur auf dem Server-Rechner erreichbar. Öffne dort <code>server/data/editor-key.txt</code> und gib den enthaltenen Schlüssel ein. Er wird beim Serverstart angelegt.</p>
      <label>Zugangsschlüssel<input v-model="key" type="password" required autocomplete="off" /></label>
      <button class="primary-button" :disabled="busy">Editor öffnen</button>
    </form>
    <template v-else>
      <button class="secondary-button" @click="lock">Editor sperren</button>
      <p>Erstelle neue Fragen oder bearbeite eine vorhandene. Jede Frage braucht vier unterschiedliche Antworten und eine Erklärung.</p>
      <form class="editor-form" @submit.prevent="save">
        <label>Thema<select v-model="form.quizId" required @change="changeQuiz"><option v-for="q in quizzes" :key="q.id" :value="q.id">{{ q.title }}</option></select></label>
        <label>Vorhandene Frage bearbeiten<select :value="editId ?? ''" @change="$event.target.value ? edit(questions.find(q=>q.id===Number($event.target.value))) : reset()"><option value="">Neue Frage erstellen</option><option v-for="q in questions" :key="q.id" :value="q.id">{{ q.question }}</option></select></label>
        <label>Kategorie<input v-model="form.category" maxlength="100" required /></label>
        <label>Schwierigkeit<select v-model="form.difficulty"><option value="leicht">Leicht</option><option value="mittel">Mittel</option><option value="schwer">Schwer</option></select></label>
        <label>Frage<textarea v-model="form.question" maxlength="1000" required rows="3"></textarea></label>
        <fieldset><legend>Antworten – richtige Lösung markieren</legend>
          <div v-for="(_,i) in form.answers" :key="i" class="editor-answer">
            <label><input v-model="form.correctIndex" type="radio" :value="i" name="correct-answer" /> {{ String.fromCharCode(65+i) }} ist richtig</label>
            <input v-model="form.answers[i]" :aria-label="'Antwort '+String.fromCharCode(65+i)" maxlength="300" required />
          </div>
        </fieldset>
        <label>Erklärung<textarea v-model="form.explanation" maxlength="2000" required rows="4"></textarea></label>
        <button class="primary-button" :disabled="busy">{{ busy ? 'Speichert …' : editId===null ? 'Neue Frage speichern' : 'Änderungen speichern' }}</button>
      </form>
    </template>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="success" role="status">{{ success }}</p>
  </section>
</template>
