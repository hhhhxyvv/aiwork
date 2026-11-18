import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import vm from 'node:vm'
const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const ts = require('typescript')
const vue = require('vue')
function harness() {
  const storage = new Map([['token','test'],['role','admin'],['permissions','["system:manage"]']])
  const events = new EventTarget()
  Object.assign(events,{location:{pathname:'/login'},clearInterval,setInterval})
  const calls = []
  const transport = { data: { roles: ['ROLE_CUSTOM'], permissions: [], userInfo: { username:'custom' } }, fail:false }
  const context = vm.createContext({ console, setTimeout, clearTimeout, Event, CustomEvent, AbortSignal,
    window: events, document: { visibilityState:'visible',addEventListener(){} },
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    fetch:async (url,config)=>{calls.push({url,config});if(transport.fail)throw Error('offline');if(transport.wait)await transport.wait;return {ok:true,status:200,json:async()=>({code:200,data:transport.data})}}
  })
  const modules = new Map()
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports
    const mod={exports:{}};modules.set(path,mod)
    const source=readFileSync(root+'src/'+path+'.ts','utf8')
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    vm.compileFunction(js,['require','module','exports'],{parsingContext:context})(name=>name==='vue'?vue:load(name.replace(/^@\//,'')),mod,mod.exports)
    return mod.exports
  }
  function mountLogin() {
    const {parse,compileScript}=require('@vue/compiler-sfc')
    const source=compileScript(parse(readFileSync(root+'src/views/auth/Login.vue','utf8')).descriptor,{id:'login-test'}).content
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const mod={exports:{}},paths=[]
    const router={currentRoute:{value:{query:{redirect:'/dashboard'}}},replace:async path=>paths.push(path)}
    const api={login:async()=>({token:'custom-token',roles:['ROLE_NEW'],permissions:['system:manage']}),loginByEmail:async()=>({token:'custom-token',roles:[]}),getCaptcha:async()=>({captchaKey:'test',captchaImg:''})}
    vm.compileFunction(js,['require','module','exports'],{parsingContext:context})(name=>{
      if(name==='vue')return vue
      if(name==='vue-router')return {useRouter:()=>router}
      if(name==='qrcode')return require('qrcode')
      if(name==='@/api/auth')return api
      if(name==='@/store/user')return load('store/user')
      if(name==='@/utils/permission')return load('utils/permission')
      if(name==='element-plus')return {ElMessage:{error(){},success(){}}}
      if(name==='@element-plus/icons-vue')return {}
      throw Error(name)
    },mod,mod.exports)
    const renderer=vue.createRenderer({patchProp(){},insert(){},remove(){},setText(){},setElementText(){},createElement:()=>({}),createText:()=>({}),createComment:()=>({}),parentNode:()=>null,nextSibling:()=>null})
    const app=renderer.createApp({...mod.exports.default,render:()=>null});app.mount({})
    return {state:app._instance.setupState,paths,close:()=>app.unmount()}
  }
  function loadRouter() {
    const source=readFileSync(root+'src/router/index.ts','utf8')
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    let guard
    const paths=[]
    const router={beforeEach:fn=>guard=fn,currentRoute:{value:{path:'/job',meta:{requiresAuth:true}}},replace:async path=>paths.push(path)}
    const mod={exports:{}}
    vm.compileFunction(js,['require','module','exports'],{parsingContext:context})(name=>{
      if(name==='vue-router')return {createRouter:()=>router,createWebHistory:()=>({})}
      if(name.endsWith('.vue'))return {default:{}}
      return load(name.replace(/^@\//,''))
    },mod,mod.exports)
    return {guard:(to)=>guard(to),router,paths}
  }
  return {load,transport,storage,calls,mountLogin,loadRouter,events}
}
test('admin and system:manage never grant an unrelated permission',()=>{
  const h=harness();const p=h.load('utils/permission')
  assert.equal(p.hasPermission('student:resume:edit'),false)
})
test('authoritative info supports custom roles and revokes reactive permission without local fallback',async()=>{
  const h=harness();const s=h.load('store/user');const p=h.load('utils/permission')
  assert.equal(typeof s.refreshSession,'function')
  h.transport.data.permissions=['student:resume:edit']
  await s.refreshSession()
  let visible
  const stop=vue.watchEffect(()=>visible=p.hasPermission('student:resume:edit'))
  assert.equal(visible,true)
  assert.deepEqual(Array.from(s.userSession.roles),['ROLE_CUSTOM'])
  h.transport.data.permissions=[];await s.refreshSession();await vue.nextTick()
  assert.equal(visible,false)
  h.transport.data.permissions=['student:resume:edit'];await s.refreshSession();await vue.nextTick()
  assert.equal(visible,true)
  h.transport.fail=true;await s.refreshSession();await vue.nextTick()
  assert.equal(visible,false)
  assert.ok(h.calls.every(c=>c.url==='/api/auth/info'))
  assert.equal(h.storage.has('permissions'),false)
  stop()
})
test('landing page is stable for permission admin, arbitrary roles and zero permissions',async()=>{
  const h=harness();const s=h.load('store/user');const p=h.load('utils/permission')
  assert.equal(typeof s.refreshSession,'function')
  h.transport.data.permissions=['sys:role:assign'];await s.refreshSession()
  assert.equal(p.getLandingPath(),'/role')
  h.transport.data.permissions=['job:post:publish','student:resume:edit'];await s.refreshSession()
  assert.equal(p.canAccessPath('/job'),true);assert.equal(p.canAccessPath('/resume'),true)
  assert.notEqual(p.getLandingPath(),'/pending-authorization')
  h.transport.data.permissions=[];await s.refreshSession()
  assert.equal(p.getLandingPath(),'/pending-authorization')
  assert.equal(p.canAccessPath('/pending-authorization'),true)
  assert.equal(p.canAccessPath('/dashboard'),false)
})
test('permission directive can restore an element after access is granted again',async()=>{
  const h=harness();const s=h.load('store/user');const p=h.load('utils/permission')
  assert.equal(typeof s.refreshSession,'function')
  const el={hidden:false,style:{display:'inline-block'}}
  p.vPermission.mounted(el,{value:'job:post:publish'})
  assert.equal(el.style.display,'none')
  h.transport.data.permissions=['job:post:publish'];await s.refreshSession();await vue.nextTick()
  assert.equal(el.style.display,'inline-block')
  h.transport.data.permissions=[];await s.refreshSession();await vue.nextTick()
  assert.equal(el.style.display,'none')
  p.vPermission.unmounted(el)
})

test('business templates never use a role name as an authorization condition',()=>{
  for (const page of ['dashboard','resume','job','interview','practice']) {
    const source=readFileSync(root+'src/views/'+page+'/index.vue','utf8')
    assert.doesNotMatch(source,/v-(?:if|else-if)="(?:currentRole|role)\s*(?:===|!==)/,page+' still grants features by role')
  }
})
test('business pages do not issue an unauthorized list request on mounting',async(t)=>{
  const {parse,compileScript}=require('@vue/compiler-sfc')
  for (const page of ['resume','dashboard','storage']) {
    const h=harness();const session=h.load('store/user');const permission=h.load('utils/permission')
    const calls=[]
    const source=compileScript(parse(readFileSync(root+'src/views/'+page+'/index.vue','utf8')).descriptor,{id:'guarded-'+page}).content
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const mod={exports:{}}
    vm.runInNewContext('(function(require,module,exports){'+compiled+'})',{console,localStorage:{getItem:()=> 'student'}})(name=>{
      if(name==='vue')return vue
      if(name==='@/store/user')return session
      if(name==='@/utils/permission')return permission
      if(name==='element-plus')return {ElMessage:{error(){},warning(){},success(){}}}
      if(name==='@element-plus/icons-vue')return {}
      if(name.startsWith('@/api/'))return new Proxy({}, {get:(_,key)=>async()=>{calls.push(key);return []}})
      throw Error(name)
    },mod,mod.exports)
    const renderer=vue.createRenderer({patchProp(){},insert(){},remove(){},setText(){},setElementText(){},createElement:()=>({}),createText:()=>({}),createComment:()=>({}),parentNode:()=>null,nextSibling:()=>null})
    const app=renderer.createApp({...mod.exports.default,render:()=>null});app.mount({})
    await new Promise(resolve=>setImmediate(resolve));app.unmount()
    assert.deepEqual(calls,[],page+' issued a request without its feature permission')
  }
})

test('all three desktop login flows accept arbitrary roles and share authoritative landing',async(t)=>{
  for(const flow of ['password','qrcode','email']) {
    const h=harness();h.transport.data.permissions=['sys:role:assign']
    const login=h.mountLogin();t.after(login.close)
    const state=login.state
    if(flow==='password') { state.formRef={validate:fn=>fn(true)};await state.handleLogin() }
    if(flow==='qrcode') await state.persistFromQr({token:'custom-token',roles:['ROLE_CUSTOM']})
    if(flow==='email') {state.emailFormRef={validate:fn=>fn(true)};await state.handleEmailLogin()}
    assert.deepEqual(login.paths,['/role'],flow)
    assert.equal(h.storage.get('token'),'custom-token')
    assert.ok(h.calls.some(call=>call.url==='/api/auth/info'))
  }
})
test('an operation-only custom role gets its feature route',async()=>{
  const h=harness();const s=h.load('store/user');const p=h.load('utils/permission')
  h.transport.data.permissions=['interview:coaching:record'];await s.refreshSession()
  assert.equal(p.getLandingPath(),'/interview')
  h.transport.data.permissions=['student:archive:remind'];await s.refreshSession()
  assert.equal(p.getLandingPath(),'/resume')
})

test('an account with multiple functional permissions renders all independent feature sections',async()=>{
  const {parse,compileScript}=require('@vue/compiler-sfc')
  for(const [page,classes] of [['resume',['hr-resume-view','counselor-resume-view','student-resume-view']],['job',['role-box']],['interview',['role-box']],['dashboard',['role-section']]]) {
    const h=harness();const session=h.load('store/user'), permission=h.load('utils/permission')
    session.userSession.permissions=Object.values(permission.pagePermissions).flat()
    const raw=readFileSync(root+'src/views/'+page+'/index.vue','utf8')
    const source=compileScript(parse(raw).descriptor,{id:'multi-'+page,inlineTemplate:true}).content
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const mod={exports:{}}
    vm.runInNewContext('(function(require,module,exports){'+js+'})',{console,window:{},localStorage:{getItem:()=>null},clearInterval})(name=>{
      if(name==='vue')return vue
      if(name==='@/store/user')return session
      if(name==='@/utils/permission')return permission
      if(name==='element-plus')return {ElMessage:{error(){},success(){}}}
      if(name==='@element-plus/icons-vue')return {}
      if(name.startsWith('@/api/'))return new Proxy({}, {get:()=>async()=>null})
      throw Error(name)
    },mod,mod.exports)
    const seen=[]
    const renderer=vue.createRenderer({patchProp(el,key,old,value){if(key==='class')seen.push(value)},insert(){},remove(){},setText(){},setElementText(){},createElement:()=>({style:{display:''}}),createText:()=>({}),createComment:()=>({}),parentNode:()=>null,nextSibling:()=>null})
    const app=renderer.createApp(mod.exports.default)
    app.directive('permission',permission.vPermission)
    for(const tag of new Set(raw.match(/el-[a-z-]+/g)))app.component(tag,{render:()=>null})
    app.mount({})
    for(const name of classes)assert.ok(seen.includes(name),page+' must render '+name)
    if(page==='job')assert.equal(seen.filter(c=>c==='role-box').length,3)
    if(page==='interview')assert.equal(seen.filter(c=>c==='role-box').length,4)
    if(page==='dashboard')assert.equal(seen.filter(c=>c==='role-section').length,4)
    app.unmount()
  }
})

test('forced authorization refresh ignores an older in-flight info response',async()=>{
  const h=harness(),s=h.load('store/user')
  let release
  h.transport.wait=new Promise(resolve=>release=resolve)
  h.transport.data.permissions=['job:post:publish']
  const old=s.refreshSession()
  h.transport.wait=null;h.transport.data.permissions=[]
  const fresh=s.refreshSession(true)
  assert.notEqual(old,fresh,'saving authorization must start a fresh authoritative request')
  await fresh;h.transport.data.permissions=['job:post:publish'];release();await old
  assert.deepEqual(Array.from(s.userSession.permissions),[])
})

test('route guards have stable zero-permission and custom-role destinations; focus revokes an open page',async()=>{
  const h=harness(),r=h.loadRouter()
  assert.equal(await r.guard({path:'/login',meta:{requiresAuth:false}}),'/pending-authorization')
  assert.equal(await r.guard({path:'/dashboard',meta:{requiresAuth:true}}),'/pending-authorization')
  assert.equal(await r.guard({path:'/pending-authorization',meta:{requiresAuth:true}}),undefined)
  h.transport.data.permissions=['job:post:publish']
  assert.equal(await r.guard({path:'/job',meta:{requiresAuth:true}}),undefined)
  h.transport.data.permissions=[];h.events.dispatchEvent(new Event('focus'))
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(r.paths.at(-1),'/pending-authorization')
  h.transport.data.permissions=['sys:role:assign']
  assert.equal(await r.guard({path:'/login',meta:{requiresAuth:false}}),'/role')
  h.storage.delete('token')
  assert.equal((await r.guard({path:'/role',meta:{requiresAuth:true}})).path,'/login')
})

test('reloading the root with an existing token leaves the temporary pending destination immediately after info',async()=>{
  const h=harness(),r=h.loadRouter()
  h.transport.data.permissions=['sys:role:assign']
  assert.equal(await r.guard({path:'/pending-authorization',meta:{requiresAuth:true}}),'/role')
})
