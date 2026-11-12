import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { openQuizDatabase, readQuizzes } from '../server/database.js'
import { createQuizApi, shuffle } from '../server/api.js'
const envFile=new URL('../server/.env',import.meta.url)
if(existsSync(envFile))process.loadEnvFile(fileURLToPath(envFile))
const testName=()=> 'quiz_app_test_'+randomBytes(8).toString('hex')
async function cleanup(db,name){
  if(!/^quiz_app_test_[a-f0-9]{16}$/.test(name))throw new Error('Unsafe test database name')
  try{await db.pool.query('DROP DATABASE \`'+name+'\`')}finally{await db.close()}
}

test('MySQL preserves questions and rounds across reconnects; imports do not overwrite edits',async()=>{
  const name=testName()
  let db=await openQuizDatabase({databaseName:name})
  try{
    const quizzes=await readQuizzes(db)
    assert.equal(quizzes.flatMap(q=>q.questions).length,70)
    const questionText="Eigene Frage mit ' und Ω?"
    const [inserted]=await db.pool.execute(
      "INSERT INTO questions(quiz_id,category,question,answers_json,correct_index,position,explanation,difficulty) VALUES(?,?,?,?,?,?,?,?)",
      ['fussball','Test',questionText,JSON.stringify(['A','B','C','D']),1,99,'Weil B richtig ist.','schwer'])
    const id=inserted.insertId
    await db.pool.execute('UPDATE questions SET question=? WHERE id=?',['Eigene Änderung',1])
    await db.saveRound({id:'00000000-0000-0000-0000-000000000001',score:4})
    await db.close()
    db=await openQuizDatabase({databaseName:name})
    const saved=(await readQuizzes(db)).flatMap(q=>q.questions)
    assert.equal(saved.find(q=>q.id===id).question,questionText)
    assert.equal(saved.find(q=>q.id===1).question,'Eigene Änderung')
    assert.equal((await db.getRound('00000000-0000-0000-0000-000000000001')).score,4)
    assert.equal(saved.length,71)
  }finally{await cleanup(db,name)}
})

async function fixture(fn) {
  const name=testName()
  const db=await openQuizDatabase({databaseName:name})
  const handler=createQuizApi(db)
  const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}))
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const base=`http://127.0.0.1:${server.address().port}`
  const call=async(path,method='GET',data,auth=false,extra={})=>{
    const response=await fetch(base+path,{
      method,headers:{'Content-Type':'application/json',...extra},
      ...(data!==undefined?{body:JSON.stringify(data)}:{})
    })
    return {status:response.status,body:await response.json()}
  }
  try { await fn({db,call}) }
  finally { await new Promise(resolve=>server.close(resolve)); await cleanup(db,name) }
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
    const original=(await readQuizzes(db)).find(q=>q.id==='fussball')
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
        await db.updateRound(runId,state=>{state.openedAt=Date.now()-21000})
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
test('removed question-management endpoints are unavailable',async()=>{
  await fixture(async({call})=>{
    for(const method of ['GET','POST','PUT']){
      const response=await call('/api/editor/questions',method,method==='GET'?undefined:{})
      assert.equal(response.status,404)
    }
  })
})
test('shuffle preserves every item and never mutates the input',()=>{
  const input=[1,2,3,4,5]
  for(let i=0;i<20;i++) assert.deepEqual(shuffle(input).sort(),input)
  assert.deepEqual(input,[1,2,3,4,5])
})

test('simultaneous submissions and next requests cannot overwrite a verdict or skip a question',async()=>{
  await fixture(async({call})=>{
    const started=(await call('/api/runs','POST',{quizId:'fussball',difficulty:'leicht'})).body
    const path='/api/runs/'+started.runId
    const questionId=started.question.id
    const replies=await Promise.all([
      call(path+'/answer','POST',{questionId,answerIndex:0}),
      call(path+'/answer','POST',{questionId,answerIndex:1})
    ])
    assert.equal(replies[0].status,200)
    assert.equal(replies[1].status,200)
    assert.deepEqual(replies[0].body.feedback,replies[1].body.feedback)
    const next=await Promise.all([
      call(path+'/next','POST',{questionId}),
      call(path+'/next','POST',{questionId})
    ])
    assert.equal(next[0].body.current,2)
    assert.equal(next[1].body.current,2)
    assert.equal(next[0].body.question.id,next[1].body.question.id)
  })
})
