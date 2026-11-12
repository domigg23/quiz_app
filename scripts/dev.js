import { fork, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root=fileURLToPath(new URL('../',import.meta.url))
let client
let stopping=false
const api=fork(fileURLToPath(new URL('../server/index.js',import.meta.url)),[],{cwd:root,stdio:['inherit','inherit','inherit','ipc']})
function stop(code=0){
  if(stopping)return
  stopping=true
  client?.kill()
  api.kill()
  process.exitCode=code
}
api.on('message',message=>{
  if(message!=='ready'||stopping)return
  client=spawn(process.execPath,['node_modules/vite/bin/vite.js','--configLoader','runner',...process.argv.slice(2)],{cwd:root,stdio:'inherit'})
  client.on('error',error=>{console.error(error.message);stop(1)})
  client.on('exit',code=>stop(code||0))
})
api.on('error',error=>{console.error(error.message);stop(1)})
api.on('exit',code=>stop(code||0))
process.once('SIGINT',()=>stop())
process.once('SIGTERM',()=>stop())
