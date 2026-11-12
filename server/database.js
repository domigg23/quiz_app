import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const databasePath = fileURLToPath(new URL('./data/quiz.sqlite', import.meta.url))
export const difficulties = ['leicht', 'mittel', 'schwer']

export function openQuizDatabase(path = process.env.QUIZ_DB_PATH || databasePath) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL,
        description TEXT NOT NULL, position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        category TEXT NOT NULL, question TEXT NOT NULL, answers_json TEXT NOT NULL,
        correct_index INTEGER NOT NULL, position INTEGER NOT NULL,
        explanation TEXT NOT NULL DEFAULT '', difficulty TEXT NOT NULL DEFAULT 'mittel'
      );
      CREATE INDEX IF NOT EXISTS questions_quiz_id ON questions(quiz_id);
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY, state_json TEXT NOT NULL
      );
    `)
    // Upgrade existing databases without deleting questions or results.
    const columns = db.prepare('PRAGMA table_info(questions)').all().map(row => row.name)
    if (!columns.includes('explanation')) db.exec("ALTER TABLE questions ADD COLUMN explanation TEXT NOT NULL DEFAULT ''")
    if (!columns.includes('difficulty')) db.exec("ALTER TABLE questions ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'mittel'")

    const seed = JSON.parse(readFileSync(new URL('./seed-quizzes.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''))
    const insertQuiz = db.prepare('INSERT INTO quizzes VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING')
    const insertQuestion = db.prepare(`INSERT INTO questions
      (id, quiz_id, category, question, answers_json, correct_index, position, explanation, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
    const enrich = db.prepare("UPDATE questions SET explanation = ?, difficulty = ? WHERE id = ? AND explanation = ''")
    db.exec('BEGIN')
    try {
      seed.forEach((quiz, position) => {
        insertQuiz.run(quiz.id, quiz.title, quiz.category, quiz.description, position)
        quiz.questions.forEach((question, index) => {
          insertQuestion.run(question.id, quiz.id, question.category, question.question,
            JSON.stringify(question.answers), question.correctIndex, index,
            question.explanation, question.difficulty)
          enrich.run(question.explanation, question.difficulty, question.id)
        })
      })
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return db
  } catch (error) { db.close(); throw error }
}

// Only used inside the server and the authenticated editor.
export function readQuizzes(db) {
  const questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY position, id')
  return db.prepare('SELECT id, title, category, description FROM quizzes ORDER BY position')
    .all().map(quiz => ({
      ...quiz,
      questions: questions.all(quiz.id).map(row => ({
        id: row.id, category: row.category, question: row.question,
        answers: JSON.parse(row.answers_json), correctIndex: row.correct_index,
        explanation: row.explanation, difficulty: row.difficulty
      }))
    }))
}

export function saveQuestion(db, input, id) {
  if (!input || typeof input !== 'object') throw new Error('Ungültige Frage')
  for (const [field, limit] of [['quizId',100], ['category',100], ['question',1000], ['explanation',2000]]) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > limit) {
      throw new Error('Bitte alle Textfelder vollständig und innerhalb der erlaubten Länge ausfüllen.')
    }
  }
  if (!db.prepare('SELECT id FROM quizzes WHERE id = ?').get(input.quizId)) throw new Error('Thema nicht gefunden')
  if (!Array.isArray(input.answers) || input.answers.length !== 4 ||
      input.answers.some(a => typeof a !== 'string' || !a.trim() || a.length > 300) ||
      new Set(input.answers.map(a => a.trim().toLocaleLowerCase('de'))).size !== 4) throw new Error('Vier unterschiedliche Antworten sind erforderlich.')
  if (!Number.isInteger(input.correctIndex) || input.correctIndex < 0 || input.correctIndex > 3) throw new Error('Richtige Antwort auswählen.')
  if (!difficulties.includes(input.difficulty)) throw new Error('Ungültiger Schwierigkeitsgrad')
  if (id !== undefined && !db.prepare('SELECT id FROM questions WHERE id = ?').get(id)) throw new Error('Frage nicht gefunden')
  const questionId = id ?? db.prepare('SELECT MAX(COALESCE(MAX(id), 0) + 1, 100000) AS id FROM questions').get().id
  const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM questions WHERE quiz_id = ?').get(input.quizId).p
  db.prepare(`INSERT INTO questions (id,quiz_id,category,question,answers_json,correct_index,position,explanation,difficulty)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    quiz_id=excluded.quiz_id,category=excluded.category,question=excluded.question,answers_json=excluded.answers_json,
    correct_index=excluded.correct_index,explanation=excluded.explanation,difficulty=excluded.difficulty`)
    .run(questionId,input.quizId,input.category.trim(),input.question.trim(),
      JSON.stringify(input.answers.map(a=>a.trim())),input.correctIndex,position,input.explanation.trim(),input.difficulty)
  return questionId
}
