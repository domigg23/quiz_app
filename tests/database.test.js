import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { openQuizDatabase, readQuizzes, saveQuestion } from '../server/database.js'
import { createQuizApi, shuffle } from '../server/api.js'

test('migrates old database without losing edits and persists editor questions and round state', () => {
  const folder=mkdtempSync(join(tmpdir(),'quiz-db-'))
  const path=join(folder,'test.sqlite')
  let db
  try {
    db=new DatabaseSync(path)
    db.exec(`CREATE TABLE quizzes(id TEXT PRIMARY KEY,title TEXT,category TEXT,description TEXT,position INTEGER);
      CREATE TABLE questions(id INTEGER PRIMARY KEY,quiz_id TEXT,category TEXT,question TEXT,answers_json TEXT,correct_index INTEGER,position INTEGER);
      INSERT INTO quizzes VALUES('fussball','Mein Titel','Sport','Eigene Beschreibung',0);
      INSERT INTO questions VALUES(1,'fussball','Fußball','Eigene Frage','["A","B","C","D"]',0,0);`)
    db.close()
    db=openQuizDatabase(path)
    assert.equal(readQuizzes(db)[0].title,'Mein Titel')
    const migrated=readQuizzes(db)[0].questions[0]
    assert.equal(migrated.question,'Eigene Frage')
    assert.ok(migrated.explanation)
    assert.equal(migrated.difficulty,'leicht')
    const input={quizId:'fussball',question:'Eigene neue Frage?',category:'Sport',
      answers:['A','B','C','D'],correctIndex:1,explanation:'Weil B richtig ist.',difficulty:'schwer'}
    const id=saveQuestion(db,input)
    db.prepare('INSERT INTO rounds VALUES (?,?)').run('persisted',JSON.stringify({score:4}))
    db.close()
    db=openQuizDatabase(path)
    const saved=readQuizzes(db)[0].questions.find(q=>q.id===id)
    assert.equal(saved.explanation,input.explanation)
    assert.equal(saved.difficulty,'schwer')
    assert.deepEqual(JSON.parse(db.prepare('SELECT state_json FROM rounds WHERE id=?').get('persisted').state_json),{score:4})
    const seed=JSON.parse(readFileSync(new URL('../server/seed-quizzes.json',import.meta.url),'utf8').replace(/^\uFEFF/,''))
    assert.equal(readQuizzes(db).flatMap(q=>q.questions).length,seed.flatMap(q=>q.questions).length+1)
  } finally { db?.close(); rmSync(folder,{recursive:true,force:true}) }
})

async function fixture(fn) {
  const db=openQuizDatabase(':memory:')
  const handler=createQuizApi(db,{editorKey:'test-editor-key'})
  const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}))
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const base=`http://127.0.0.1:${server.address().port}`
  const call=async(path,method='GET',data,auth=false,extra={})=>{
    const response=await fetch(base+path,{
      method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer test-editor-key'}:{}),...extra},
      ...(data!==undefined?{body:JSON.stringify(data)}:{})
    })
    return {status:response.status,body:await response.json()}
  }
  try { await fn({db,call}) }
  finally { await new Promise(resolve=>server.close(resolve)); db.close() }
}
test('catalog and unanswered rounds never reveal solutions; filter, score, timeout and practice are server controlled', async()=>{
  await fixture(async({db,call})=>{
    const catalog=await call('/api/quizzes')
    assert.equal(catalog.status,200)
    assert.ok(!JSON.stringify(catalog.body).includes('correctIndex'))
    assert.ok(!JSON.stringify(catalog.body).includes('explanation'))
    assert.equal((await call('/api/quizzes','POST',{})).status,405)
    assert.equal((await call('/api/missing')).status,404)
    assert.equal((await call('/api/runs','POST',{quizId:'fussball',difficulty:'unbekannt'})).status,400)
    assert.equal((await call('/api/runs','POST',{quizId:'missing'})).status,404)
    assert.equal((await call('/api/runs','POST',{quizId:'fussball'},false,{Origin:'https://other.example'})).status,403)
    let round=(await call('/api/runs','POST',{quizId:'fussball',difficulty:'leicht'})).body
    const runId=round.runId
    const original=readQuizzes(db).find(q=>q.id==='fussball')
    assert.equal(round.total,original.questions.filter(q=>q.difficulty==='leicht').length)
    assert.ok(!JSON.stringify(round).includes('correctIndex'))
    assert.equal((await call(`/api/runs/${runId}/result`)).status,409)
    assert.equal((await call(`/api/runs/${runId}/next`,'POST',{questionId:round.question.id})).status,409)
    assert.equal((await call(`/api/runs/${runId}/answer`,'POST',{questionId:round.question.id,answerIndex:999})).status,400)
    const missed=[]
    let index=0
    while(!round.completed){
      assert.equal(round.question.difficulty,'leicht')
      const q=original.questions.find(q=>q.id===round.question.id)
      assert.deepEqual([...round.question.answers].sort(),[...q.answers].sort())
      const answerIndex=round.question.answers.indexOf(q.answers[q.correctIndex])
      if(index===0){
        const row=db.prepare('SELECT state_json FROM rounds WHERE id=?').get(runId)
        const state=JSON.parse(row.state_json)
        state.openedAt=Date.now()-21000
        db.prepare('UPDATE rounds SET state_json=? WHERE id=?').run(JSON.stringify(state),runId)
        missed.push(q.id)
      }
      const answered=await call(`/api/runs/${runId}/answer`,'POST',{questionId:q.id,answerIndex})
      assert.equal(answered.status,200)
      assert.equal(answered.body.feedback.correct,index!==0)
      assert.ok(answered.body.feedback.explanation)
      assert.equal(answered.body.feedback.correctIndex,answerIndex)
      const replay=await call(`/api/runs/${runId}/answer`,'POST',{questionId:q.id,answerIndex:(answerIndex+1)%4})
      assert.deepEqual(replay.body.feedback,answered.body.feedback)
      round=(await call(`/api/runs/${runId}/next`,'POST',{questionId:q.id})).body
      // Retrying the same next request must not skip a question.
      assert.equal((await call(`/api/runs/${runId}/next`,'POST',{questionId:q.id})).body.current,round.current)
      index++
    }
    const summary=await call(`/api/runs/${runId}/result`)
    assert.equal(summary.body.score,round.total-1)
    assert.deepEqual(summary.body.missedIds,missed)
    const practice=await call('/api/runs','POST',{quizId:'fussball',difficulty:'leicht',sourceRunId:runId})
    assert.equal(practice.body.total,1)
    assert.equal(practice.body.question.id,missed[0])
    assert.equal(practice.body.isPractice,true)
  })
})
test('editor requires authentication, validates input, writes and edits questions with permanent IDs',async()=>{
  await fixture(async({call})=>{
    assert.equal((await call('/api/editor/questions')).status,401)
    const input={quizId:'fussball',question:'Neue Testfrage?',category:'Fußball',answers:['A','B','C','D'],
      correctIndex:2,explanation:'Antwort C ist die Lösung.',difficulty:'schwer'}
    assert.equal((await call('/api/editor/questions','POST',input)).status,401)
    assert.equal((await call('/api/editor/questions','POST',{...input,answers:['A','A','B','C']},true)).status,400)
    assert.equal((await call('/api/editor/questions','POST',{...input,difficulty:'extrem'},true)).status,400)
    assert.equal((await call('/api/editor/questions','POST',{...input,correctIndex:4},true)).status,400)
    const saved=await call('/api/editor/questions','POST',input,true)
    assert.equal(saved.status,201)
    assert.ok(saved.body.id>=100000)
    assert.equal((await call('/api/editor/questions/'+saved.body.id,'PUT',{...input,question:'Geänderte Testfrage?'},true)).status,200)
    const edited=(await call('/api/editor/questions','GET',undefined,true)).body.flatMap(q=>q.questions).find(q=>q.id===saved.body.id)
    assert.equal(edited.question,'Geänderte Testfrage?')
    assert.equal(edited.correctIndex,2)
    assert.equal(edited.explanation,input.explanation)
  })
})
test('shuffle preserves every item and never mutates the input',()=>{
  const input=[1,2,3,4,5]
  for(let i=0;i<20;i++) assert.deepEqual(shuffle(input).sort(),input)
  assert.deepEqual(input,[1,2,3,4,5])
})
