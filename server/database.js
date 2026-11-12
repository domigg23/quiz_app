import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'

export const difficulties = ['leicht', 'mittel', 'schwer']

function parseJson(value) {
  return typeof value === 'string' ? JSON.parse(value) : value
}

export async function openQuizDatabase({ databaseName = process.env.DB_NAME || 'quiz_app' } = {}) {
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(databaseName)) {
    throw new Error('DB_NAME darf nur Buchstaben, Zahlen und Unterstriche enthalten.')
  }

  // Eine einzige Verbindung für die gesamte Laufzeit des Servers.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'quiz_user',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4'
  })

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`USE \`${databaseName}\``)
    await connection.query(`CREATE TABLE IF NOT EXISTS quizzes (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      position INT NOT NULL
    ) ENGINE=InnoDB`)
    await connection.query(`CREATE TABLE IF NOT EXISTS questions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      quiz_id VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      question TEXT NOT NULL,
      answers_json JSON NOT NULL,
      correct_index INT NOT NULL,
      position INT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty VARCHAR(10) NOT NULL DEFAULT 'mittel',
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB AUTO_INCREMENT=100000`)
    await connection.query(`CREATE TABLE IF NOT EXISTS rounds (
      id CHAR(36) PRIMARY KEY,
      state_json JSON NOT NULL
    ) ENGINE=InnoDB`)

    const text = readFileSync(new URL('./seed-quizzes.json', import.meta.url), 'utf8')
    const quizzes = JSON.parse(text.replace(/^\uFEFF/, ''))

    await connection.beginTransaction()
    try {
      for (const [position, quiz] of quizzes.entries()) {
        await connection.execute(
          'INSERT INTO quizzes VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
          [quiz.id, quiz.title, quiz.category, quiz.description, position]
        )
        for (const [index, question] of quiz.questions.entries()) {
          await connection.execute(
            `INSERT INTO questions
              (id, quiz_id, category, question, answers_json, correct_index, position, explanation, difficulty)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
            [question.id, quiz.id, question.category, question.question,
              JSON.stringify(question.answers), question.correctIndex, index,
              question.explanation || '', question.difficulty || 'mittel']
          )
          if (question.explanation) {
            await connection.execute(
              "UPDATE questions SET explanation=?, difficulty=? WHERE id=? AND explanation=''",
              [question.explanation, question.difficulty || 'mittel', question.id]
            )
          }
        }
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    }
  } catch (error) {
    await connection.end()
    throw error
  }

  // Vorgänge nacheinander ausführen, damit sich Transaktionen nicht vermischen.
  let pending = Promise.resolve()
  function run(task) {
    const result = pending.then(task)
    pending = result.catch(() => {})
    return result
  }

  return {
    query: (sql, values) => run(() => connection.query(sql, values)),
    execute: (sql, values) => run(() => connection.execute(sql, values)),
    close: () => run(() => connection.end()),

    getRound(id) {
      return run(async () => {
        const [rows] = await connection.execute('SELECT state_json FROM rounds WHERE id=?', [id])
        return rows.length ? parseJson(rows[0].state_json) : null
      })
    },

    saveRound(round) {
      return run(() => connection.execute(
        'INSERT INTO rounds VALUES (?, ?)',
        [round.id, JSON.stringify(round)]
      ))
    },

    updateRound(id, change) {
      return run(async () => {
        await connection.beginTransaction()
        try {
          const [rows] = await connection.execute(
            'SELECT state_json FROM rounds WHERE id=? FOR UPDATE', [id]
          )
          if (!rows.length) {
            await connection.rollback()
            return null
          }
          const round = parseJson(rows[0].state_json)
          change(round)
          await connection.execute(
            'UPDATE rounds SET state_json=? WHERE id=?',
            [JSON.stringify(round), id]
          )
          await connection.commit()
          return round
        } catch (error) {
          await connection.rollback()
          throw error
        }
      })
    }
  }
}

export async function readQuizzes(db) {
  const [quizzes] = await db.query('SELECT id, title, category, description FROM quizzes ORDER BY position, id')
  const [questions] = await db.query('SELECT * FROM questions ORDER BY position, id')

  return quizzes.map(quiz => ({
    ...quiz,
    questions: questions.filter(question => question.quiz_id === quiz.id).map(question => ({
      id: question.id,
      category: question.category,
      question: question.question,
      answers: parseJson(question.answers_json),
      correctIndex: question.correct_index,
      explanation: question.explanation,
      difficulty: question.difficulty
    }))
  }))
}
