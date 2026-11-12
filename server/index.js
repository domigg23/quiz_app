import { createServer } from 'node:http'
import { existsSync, createReadStream, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { extname, resolve, sep } from 'node:path'
import { openQuizDatabase } from './database.js'
import { createQuizApi } from './api.js'

const envFile=new URL('./.env',import.meta.url)
if(existsSync(envFile))process.loadEnvFile(fileURLToPath(envFile))
const dist=fileURLToPath(new URL('../dist/',import.meta.url))
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
let db
let server
try {
  db=await openQuizDatabase()
  const api=createQuizApi(db)
  server=createServer((req,res)=>{
    api(req,res,()=>{
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
      let path
      try{
        const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
        path=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname))
      }catch{res.writeHead(400);res.end();return}
      if(!path.startsWith(dist.endsWith(sep)?dist:dist+sep)||!existsSync(path)||!statSync(path).isFile()){
        res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'})
        res.end('Nicht gefunden. Frontend zuerst mit npm run build erstellen oder npm run dev nutzen.')
        return
      }
      res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream')
      res.setHeader('X-Content-Type-Options','nosniff')
      if(req.method==='HEAD'){res.end();return}
      const stream=createReadStream(path)
      stream.on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end()})
      stream.pipe(res)
    })
  })
  await new Promise((resolve,reject)=>{
    server.once('error',reject)
    server.listen(Number(process.env.PORT||3001),process.env.HOST||'127.0.0.1',resolve)
  })
  console.log(`Quiz-Server: http://${process.env.HOST||'127.0.0.1'}:${server.address().port} → MySQL (${process.env.DB_NAME||'quiz_app'})`)
  process.send?.('ready')
}catch(error){
  console.error('Quiz-Server konnte nicht starten:',error.code||error.message)
  console.error('Bitte MySQL-Dienst und die Angaben in server/.env prüfen.')
  await db?.close()
  process.exit(1)
}
async function shutdown(){
  server.closeIdleConnections()
  await new Promise(resolve=>server.close(resolve))
  await db.close()
  process.exit(0)
}
process.once('SIGINT',shutdown)
process.once('SIGTERM',shutdown)
