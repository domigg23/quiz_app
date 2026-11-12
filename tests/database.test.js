import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { openQuizDatabase, readQuizzes } from '../server/database.js'
import { createQuizApi } from '../server/api.js'

test('imports the complete seed once and preserves database edits across restarts', () => {
  const folder = mkdtempSync(join(tmpdir(), 'quiz-db-'))
  let db
  try {
    const path = join(folder, 'quiz.sqlite')
    db = openQuizDatabase(path)
    const seed = JSON.parse(readFileSync(new URL('../server/seed-quizzes.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
    assert.deepEqual(JSON.parse(JSON.stringify(readQuizzes(db))), seed)
    db.prepare('UPDATE questions SET question = ? WHERE id = ?').run('Datenbankänderung', seed[0].questions[0].id)
    db.close()
    db = openQuizDatabase(path)
    assert.equal(readQuizzes(db)[0].questions[0].question, 'Datenbankänderung')
    assert.equal(db.prepare('SELECT count(*) AS n FROM questions').get().n, seed.flatMap(q => q.questions).length)
  } finally {
    db?.close()
    rmSync(folder, { recursive: true, force: true })
  }
})

test('fetch receives database changes, correct JSON and API error status codes', async () => {
  const db = openQuizDatabase(':memory:')
  const handler = createQuizApi(db)
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end() }))
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const url = `http://127.0.0.1:${server.address().port}`
    db.prepare('UPDATE quizzes SET title = ? WHERE id = ?').run('Aus SQLite', 'fussball')
    const response = await fetch(url + '/api/quizzes')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /application\/json/)
    const data = await response.json()
    assert.equal(data[0].title, 'Aus SQLite')
    assert.ok(data[0].questions[0].answers[data[0].questions[0].correctIndex])
    assert.equal((await fetch(url + '/api/quizzes', { method: 'POST' })).status, 405)
    assert.equal((await fetch(url + '/api/missing')).status, 404)
  } finally {
    await new Promise(resolve => server.close(resolve))
    db.close()
  }
})
