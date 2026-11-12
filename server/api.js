import { randomInt, randomUUID } from 'node:crypto'
import { readQuizzes, difficulties } from './database.js'

export function shuffle(items) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
async function body(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (Buffer.byteLength(text) > 30000) fail(413, 'Anfrage zu groß')
  }
  try { return JSON.parse(text) } catch { fail(400, 'Ungültiges JSON') }
}
function result(round) {
  return {
    runId: round.id, quizId: round.quizId, quizTitle: round.title,
    difficulty: round.difficulty, isPractice: round.isPractice,
    score: round.verdicts.filter(v => v.correct).length, total: round.questions.length,
    missedIds: round.verdicts.filter(v => !v.correct).map(v => v.questionId),
    completedAt: round.completedAt
  }
}
function publicRound(round) {
  const question = round.questions[round.index]
  return {
    runId: round.id, total: round.questions.length, current: round.index + 1,
    score: round.verdicts.filter(v=>v.correct).length, isPractice: round.isPractice,
    difficulty: round.difficulty, completed: Boolean(round.completedAt),
    question: question && { id: question.id, question: question.question, category: question.category,
      difficulty: question.difficulty, answers: question.answers },
    remainingMs: Math.max(0, 20000 - (Date.now() - round.openedAt)),
    feedback: round.verdicts[round.index] || null
  }
}
export function createQuizApi(db) {
  async function loadRound(id) {
    const round=await db.getRound(id)
    if(!round) fail(404,'Runde nicht gefunden')
    return round
  }
  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    if (path !== '/api' && !path.startsWith('/api/')) return next()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    const send = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)) }
    try {
      // Browser writes must come from this app, not from another website.
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) fail(403, 'Fremder Ursprung nicht erlaubt')
      if (path === '/api/quizzes') {
        if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); fail(405, 'Nur GET ist erlaubt') }
        return send((await readQuizzes(db)).map(quiz=>({
          ...quiz, questions: quiz.questions.map(q=>({ id:q.id, difficulty:q.difficulty }))
        })))
      }
      if (path === '/api/runs' && req.method === 'POST') {
        const input = await body(req)
        if (!input || typeof input.quizId !== 'string') fail(400, 'Quiz fehlt')
        const quiz = (await readQuizzes(db)).find(q=>q.id===input.quizId)
        if (!quiz) fail(404, 'Quiz nicht gefunden')
        const difficulty = input.difficulty || 'alle'
        if (!['alle', ...difficulties].includes(difficulty)) fail(400, 'Ungültige Schwierigkeit')
        let questions = quiz.questions.filter(q=>difficulty==='alle'||q.difficulty===difficulty)
        if (input.sourceRunId) {
          const source = await loadRound(String(input.sourceRunId))
          if (!source.completedAt || source.quizId !== quiz.id || source.difficulty !== difficulty) fail(400, 'Keine passende abgeschlossene Runde')
          const missed = result(source).missedIds
          questions = questions.filter(q=>missed.includes(q.id))
        }
        if (!questions.length) fail(400, 'Für diese Auswahl gibt es keine offenen Fragen.')
        questions = shuffle(questions).map(q=>{
          const order = shuffle(q.answers.map((_,i)=>i))
          return { ...q, answers:order.map(i=>q.answers[i]), correctIndex:order.indexOf(q.correctIndex) }
        })
        const round = { id:randomUUID(), quizId:quiz.id, title:quiz.title, difficulty,
          isPractice:Boolean(input.sourceRunId), questions, index:0, verdicts:[], openedAt:Date.now() }
        await db.saveRound(round)
        return send(publicRound(round), 201)
      }
      const match = path.match(/^\/api\/runs\/([a-f0-9-]+)(?:\/(answer|next|result))?$/)
      if (match) {
        const action = match[2]
        if (req.method === 'GET') {
          const round=await loadRound(match[1])
          if(action==='result'){
            if(!round.completedAt)fail(409,'Runde ist noch nicht abgeschlossen')
            return send(result(round))
          }
          if(!action)return send(publicRound(round))
        }
        if(req.method==='POST' && ['answer','next'].includes(action)){
          const input=await body(req)
          const round=await db.updateRound(match[1],round=>{
            const question=round.questions[round.index]
            if(action==='answer'){
              if(!input||input.questionId!==question.id||round.completedAt) fail(409,'Frage ist nicht mehr aktuell')
              if(input.answerIndex!==null&&(!Number.isInteger(input.answerIndex)||input.answerIndex<0||input.answerIndex>=question.answers.length))fail(400,'Ungültige Antwort')
              if(!round.verdicts[round.index]){
                const timedOut=Date.now()-round.openedAt>=20000
                round.verdicts.push({
                  questionId:question.id,selectedIndex:input.answerIndex,
                  correct:!timedOut&&input.answerIndex===question.correctIndex,
                  timedOut:timedOut||input.answerIndex===null,
                  correctIndex:question.correctIndex,explanation:question.explanation
                })
              }
            }else{
              if(round.completedAt)return
              if(round.index>0&&input?.questionId===round.questions[round.index-1].id)return
              if(input?.questionId!==question.id||!round.verdicts[round.index])fail(409,'Zuerst die aktuelle Frage beantworten')
              if(round.index+1===round.questions.length)round.completedAt=new Date().toISOString()
              else{round.index++;round.openedAt=Date.now()}
            }
          })
          if(!round)fail(404,'Runde nicht gefunden')
          return send(publicRound(round))
        }
        fail(405, 'Methode nicht erlaubt')
      }
      fail(404, 'API-Endpunkt nicht gefunden')
    } catch (error) {
      if (!error.status) console.error(error)
      send({ error:error.status ? error.message : 'Serverfehler beim Verarbeiten der Anfrage' }, error.status || 500)
    }
  }
}
