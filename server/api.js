import { openQuizDatabase, readQuizzes } from './database.js'

// Runs in Node.js, never in the browser. Both Vite modes use the same database.
export function createQuizApi(db) {
  return (req, res, next) => {
    const pathname = new URL(req.url, 'http://localhost').pathname
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return next()

    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    if (pathname !== '/api/quizzes') {
      res.statusCode = 404
      return res.end(JSON.stringify({ error: 'API-Endpunkt nicht gefunden' }))
    }
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.setHeader('Allow', 'GET')
      return res.end(JSON.stringify({ error: 'Nur GET ist erlaubt' }))
    }
    try {
      res.end(JSON.stringify(readQuizzes(db)))
    } catch (error) {
      console.error('Quizdatenbank konnte nicht gelesen werden:', error)
      res.statusCode = 500
      res.end(JSON.stringify({ error: 'Quizdaten konnten nicht geladen werden' }))
    }
  }
}

export function quizApiPlugin() {
  function connect(server) {
    const db = openQuizDatabase()
    server.middlewares.use(createQuizApi(db))
    server.httpServer?.once('close', () => db.close())
  }
  return {
    name: 'quiz-database-api',
    configureServer: connect,
    configurePreviewServer: connect
  }
}
