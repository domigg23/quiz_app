import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const databasePath = fileURLToPath(new URL('./data/quiz.sqlite', import.meta.url))
const seedPath = new URL('./seed-quizzes.json', import.meta.url)

// JSON is used only for the first import. Existing databases are never overwritten.
export function openQuizDatabase(path = databasePath) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY,
        quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        answers_json TEXT NOT NULL,
        correct_index INTEGER NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS questions_quiz_id ON questions(quiz_id);
    `)
    if (db.prepare('SELECT COUNT(*) AS count FROM quizzes').get().count === 0) {
      const seed = JSON.parse(readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, ''))
      const insertQuiz = db.prepare('INSERT INTO quizzes VALUES (?, ?, ?, ?, ?)')
      const insertQuestion = db.prepare('INSERT INTO questions VALUES (?, ?, ?, ?, ?, ?, ?)')
      db.exec('BEGIN')
      try {
        seed.forEach((quiz, position) => {
          insertQuiz.run(quiz.id, quiz.title, quiz.category, quiz.description, position)
          quiz.questions.forEach((question, index) => {
            insertQuestion.run(question.id, quiz.id, question.category, question.question,
              JSON.stringify(question.answers), question.correctIndex, index)
          })
        })
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    }
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export function readQuizzes(db) {
  const questions = db.prepare(`
    SELECT id, category, question, answers_json, correct_index
    FROM questions WHERE quiz_id = ? ORDER BY position
  `)
  return db.prepare('SELECT id, title, category, description FROM quizzes ORDER BY position')
    .all().map(quiz => ({
      ...quiz,
      questions: questions.all(quiz.id).map(row => ({
        id: row.id,
        category: row.category,
        question: row.question,
        answers: JSON.parse(row.answers_json),
        correctIndex: row.correct_index
      }))
    }))
}
