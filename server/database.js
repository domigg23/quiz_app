import mysql from 'mysql2/promise'
import { readFileSync } from 'node:fs'
export const difficulties=['leicht','mittel','schwer']
const json=value=>typeof value==='string'?JSON.parse(value):value

export async function openQuizDatabase({ databaseName=process.env.DB_NAME || 'quiz_app' }={}) {
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(databaseName)) throw new Error('DB_NAME darf nur Buchstaben, Zahlen und Unterstriche enthalten.')
  const config={host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),
    user:process.env.DB_USER||'quiz_user',password:process.env.DB_PASSWORD||'',
    charset:'utf8mb4',supportBigNumbers:true,bigNumberStrings:false}
  const connection=await mysql.createConnection(config)
  try { await connection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`) }
  finally { await connection.end() }
  const pool=mysql.createPool({...config,database:databaseName,connectionLimit:10})
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS quizzes(
      id VARCHAR(100) PRIMARY KEY, title VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL,
      description TEXT NOT NULL, position INT NOT NULL
    ) ENGINE=InnoDB`)
    await pool.query(`CREATE TABLE IF NOT EXISTS questions(
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,quiz_id VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,question TEXT NOT NULL,answers_json JSON NOT NULL,
      correct_index INT NOT NULL,position INT NOT NULL,explanation TEXT NOT NULL,
      difficulty VARCHAR(10) NOT NULL DEFAULT 'mittel',
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      INDEX questions_quiz_id(quiz_id)
    ) ENGINE=InnoDB AUTO_INCREMENT=100000`)
    await pool.query('CREATE TABLE IF NOT EXISTS rounds(id CHAR(36) PRIMARY KEY,state_json JSON NOT NULL) ENGINE=InnoDB')
    const seed=JSON.parse(readFileSync(new URL('./seed-quizzes.json',import.meta.url),'utf8').replace(/^\uFEFF/,''))
    const db=await pool.getConnection()
    try {
      await db.beginTransaction()
      // Existing MySQL edits win over seed imports.
      for(const [position,quiz] of seed.entries()) {
          await db.execute('INSERT INTO quizzes(id,title,category,description,position) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id',
            [quiz.id,quiz.title,quiz.category,quiz.description,position])
          for(const [index,q] of quiz.questions.entries()) {
            await db.execute(`INSERT INTO questions(id,quiz_id,category,question,answers_json,correct_index,position,explanation,difficulty)
              VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
              [q.id,quiz.id,q.category,q.question,JSON.stringify(q.answers),q.correctIndex,index,q.explanation||'',q.difficulty||'mittel'])
            if(q.explanation) await db.execute("UPDATE questions SET explanation=?,difficulty=? WHERE id=? AND explanation=''",
              [q.explanation,q.difficulty||'mittel',q.id])
          }
      }
      await db.commit()
    } catch(error) { await db.rollback(); throw error }
    finally { db.release() }
    return {
      pool,
      close:()=>pool.end(),
      async getRound(id) {
        const [rows]=await pool.execute('SELECT state_json FROM rounds WHERE id=?',[id])
        return rows[0]?json(rows[0].state_json):null
      },
      async saveRound(round) {
        await pool.execute('INSERT INTO rounds(id,state_json) VALUES(?,?)',[round.id,JSON.stringify(round)])
      },
      async updateRound(id,mutate) {
        const connection=await pool.getConnection()
        try {
          await connection.beginTransaction()
          const [rows]=await connection.execute('SELECT state_json FROM rounds WHERE id=? FOR UPDATE',[id])
          if(!rows.length){ await connection.rollback(); return null }
          const round=json(rows[0].state_json)
          mutate(round)
          await connection.execute('UPDATE rounds SET state_json=? WHERE id=?',[JSON.stringify(round),id])
          await connection.commit()
          return round
        } catch(error) { await connection.rollback(); throw error }
        finally { connection.release() }
      }
    }
  } catch(error) { await pool.end(); throw error }
}

export async function readQuizzes(db) {
  const [quizzes]=await db.pool.query('SELECT id,title,category,description FROM quizzes ORDER BY position,id')
  const [rows]=await db.pool.query('SELECT * FROM questions ORDER BY position,id')
  return quizzes.map(quiz=>({...quiz,questions:rows.filter(q=>q.quiz_id===quiz.id).map(q=>({
    id:q.id,category:q.category,question:q.question,answers:json(q.answers_json),
    correctIndex:q.correct_index,explanation:q.explanation,difficulty:q.difficulty
  }))}))
}
