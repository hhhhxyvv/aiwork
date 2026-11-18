import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { test } from 'node:test'
import vm from 'node:vm'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const { parse, compileScript } = require('@vue/compiler-sfc')
const vue = require('vue')
const axios = require('axios')
const plain = (value) => JSON.parse(JSON.stringify(value))

// These fixtures follow SystemController, RoleVO, PermissionVO and RolePermissionDTO.
function harness({ failPermissions = false, failSave = false, sessionPermissions = ['sys:role:assign','sys:data-scope:assign'] } = {}) {
  const roles = [
    { id: 1, roleCode: 'ROLE_STUDENT', roleName: '学生', dataScope: 4,
      permissions: ['student:profile:view'], configured: true },
    { id: 4, roleCode: 'ROLE_ADMIN', roleName: '院系管理员', dataScope: 1,
      permissions: ['job:post:publish', 'sys:role:assign', 'system:manage'], configured: true },
    { id: 77, roleCode: 'ROLE_ADVISOR', roleName: '就业指导老师', dataScope: 2,
      permissions: ['job:post:publish'], configured: true }
  ]
  const permissions = [
    { code: 'student:profile:view', name: '学生档案查看' },
    { code: 'job:post:publish', name: '企业岗位发布' },
    { code: 'sys:role:assign', name: '角色动态授权' }
  ]
  const calls = []
  const notices = []
  const messages = Object.fromEntries(['error', 'success', 'warning', 'info'].map(
    (kind) => [kind, (message) => notices.push({ kind, message })]
  ))
  const storage = new Map([['token', 'test-token']])
  const context = vm.createContext({
    console, setTimeout, clearTimeout, Event, AbortSignal,
    fetch: async () => ({ok:true,status:200,json:async()=>({code:200,data:{roles:["ROLE_PERMISSION_ADMIN"],permissions:sessionPermissions,userInfo:{}}})}),
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    window: { location: { href: '' }, dispatchEvent() {} }
  })
  function evaluate(source, filename, imports) {
    const js = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
    }).outputText
    const mod = { exports: {} }
    vm.compileFunction(js, ['require', 'module', 'exports'], { filename, parsingContext: context })(
      (name) => {
        if (Object.hasOwn(imports, name)) return imports[name]
        throw new Error(`Unexpected import: ${name}`)
      }, mod, mod.exports
    )
    return mod.exports
  }
  const session = evaluate(readFileSync(join(root, 'src/store/user.ts'), 'utf8'), 'user.ts', { vue })
  session.userSession.permissions = sessionPermissions
  const permission = evaluate(readFileSync(join(root, 'src/utils/permission.ts'), 'utf8'), 'permission-utils.ts', { vue, '@/store/user': session })
  const client = evaluate(readFileSync(join(root, 'src/utils/request.ts'), 'utf8'),
    'request.ts', { axios, 'element-plus': { ElMessage: messages }, '@/store/user':session }).default
  // Only the external HTTP transport is replaced; real Axios and interceptors run.
  client.defaults.adapter = async (config) => {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    calls.push({ method: config.method, url: config.url, baseURL: config.baseURL,
      authorization: config.headers.get('Authorization'), body, params:config.params })
    let data
    if (config.method === 'get' && config.url === '/system/roles') {
      data = plain(roles)
    } else if (config.method === 'get' && config.url === '/system/permissions') {
      if (failPermissions) throw new Error('Permission list unavailable')
      data = plain(permissions)
    } else if (config.method === 'put' && /^\/system\/roles\/\d+\/permissions$/.test(config.url)) {
      if (failSave) throw new Error('Save unavailable')
      assert.deepEqual(Object.keys(body), ['permissions'])
      assert.ok(Array.isArray(body.permissions))
      for (const code of body.permissions) {
        assert.equal(typeof code, 'string')
        assert.ok(permissions.some((permission) => permission.code === code))
      }
      const id = Number(config.url.split('/')[3])
      const role = roles.find((role) => role.id === id)
      assert.ok(role, 'the saved role must exist in the backend list')
      role.permissions = [...body.permissions]
      data = null
    } else if (config.method === 'get' && config.url === '/system/users') {
      data = { records:[{id:91,username:'custom',realName:'自定义账号',status:1,roleCodes:['ROLE_ADVISOR']}],total:1,current:1,size:20 }
    } else if (config.method === 'post' && config.url === '/system/roles') {
      assert.deepEqual(Object.keys(body).sort(), ['roleCode','roleName'])
      roles.push({id:88,...body,dataScope:4,permissions:[],configured:true}); data=null
    } else if (config.method === 'post' && config.url === '/system/users/91/roles') {
      assert.ok(Array.isArray(body.roleCodes));data=null
    } else if (config.method === 'put' && /\/system\/roles\/\d+\/data-scope$/.test(config.url)) {
      assert.ok([1,2,3,4].includes(body.dataScope));data=null
    } else if (config.method === 'get' && config.url === '/system/users/91/student-scopes') {
      data=[{department:'信息学院',className:'一班'}]
    } else if (config.method === 'put' && config.url === '/system/users/91/student-scopes') {
      assert.ok(Array.isArray(body.scopes));data=null
    } else {
      throw new Error(`Backend has no route ${config.method} ${config.url}`)
    }
    return { data: { code: 200, message: '操作成功', data }, status: 200,
      statusText: 'OK', headers: {}, config }
  }
  const api = evaluate(readFileSync(join(root, 'src/api/permission.ts'), 'utf8'),
    'permission.ts', { '@/utils/request': { __esModule: true, default: client } })
  const { descriptor } = parse(readFileSync(join(root, 'src/views/role/index.vue'), 'utf8'))
  const script = compileScript(descriptor, { id: 'permission-test' }).content
  const component = evaluate(script, 'role-page.ts', {
    vue, 'element-plus': { ElMessage: messages },
    '@element-plus/icons-vue': { Key: {}, Folder: {} }, '@/api/permission': api, '@/store/user':session, '@/utils/permission':permission
  }).default
  const renderer = vue.createRenderer({
    patchProp() {}, insert() {}, remove() {}, setText() {}, setElementText() {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    parentNode: () => null, nextSibling: () => null
  })
  const app = renderer.createApp({ ...component, render: () => null })
  app.mount({})
  const state = app._instance.setupState
  let checked = []
  state.treeRef = {
    setCheckedKeys: (keys) => { checked = [...keys] },
    getCheckedKeys: () => checked
  }
  return { state, roles, calls, notices, api, session, client,
    ready: () => new Promise((resolve) => setImmediate(resolve)),
    checked: () => plain(checked),
    check: (keys) => { checked = [...keys] },
    close: () => app.unmount() }
}

test('loads backend role IDs, names and additional roles instead of a fixed role mapping', async (t) => {
  const h = harness()
  t.after(h.close)
  await h.ready()
  assert.deepEqual(plain(h.state.roleList).map(({ id, roleName }) => [id, roleName]),
    [[1, '学生'], [4, '院系管理员'], [77, '就业指导老师']])
  assert.equal(h.calls[0].url, '/system/roles')
  assert.equal(h.calls[0].baseURL, '/api')
  assert.equal(h.calls[0].authorization, 'Bearer test-token')
})

test('saves the selected role by code and excludes management permissions for department admins', async (t) => {
  const h = harness()
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  assert.deepEqual(h.checked(), ['job:post:publish'])
  h.check(['job:post:publish', 'sys:role:assign'])
  await h.state.handleSave()
  const save = h.calls.find((call) => call.method === 'put')
  assert.ok(save, 'saving must call the existing PUT endpoint')
  assert.equal(save.url, '/system/roles/4/permissions')
  assert.deepEqual(save.body, { permissions: ['job:post:publish'] })
  assert.equal(h.state.dialogVisible, false)
})

test('reopening a role reflects authorization changes made after the initial load', async (t) => {
  const h = harness()
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  h.state.resetDialogState()
  h.roles[1].permissions = ['student:profile:view']
  await h.state.openAssignDialog(role)
  assert.deepEqual(h.checked(), ['student:profile:view'])
})

test('failed permission loading cannot overwrite an existing role authorization', async (t) => {
  const h = harness({ failPermissions: true })
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  await h.state.handleSave()
  assert.equal(h.calls.filter((call) => call.method === 'put' || call.method === 'post').length, 0)
  assert.equal(h.state.permissionsReady, false)
  assert.ok(h.notices.some(({ kind }) => kind === 'error'))
})

test('save failure leaves the dialog and checked permissions available for retry', async (t) => {
  const h = harness({ failSave: true })
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  h.check(['job:post:publish'])
  await h.state.handleSave()
  assert.ok(h.calls.some((call) => call.method === 'put'))
  assert.equal(h.state.dialogVisible, true)
  assert.deepEqual(h.checked(), ['job:post:publish'])
  assert.equal(h.state.saving, false)
  assert.ok(h.notices.some(({ kind }) => kind === 'error'))
})

test('clearing all checkboxes sends an explicit empty array using the existing contract', async (t) => {
  const h = harness()
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  h.check([])
  await h.state.handleSave()
  const save = h.calls.find((call) => call.method === 'put')
  assert.ok(save)
  assert.equal(save.url, '/system/roles/4/permissions')
  assert.deepEqual(save.body, { permissions: [] })
})

test('management APIs use secure users pagination, zero-permission role creation and explicit assignment contracts',async(t)=>{
  const h=harness();t.after(h.close);await h.ready()
  assert.equal(typeof h.api.getUsers,'function')
  const users=await h.api.getUsers({keyword:'custom',pageNum:1,pageSize:20})
  assert.equal(users.records[0].id,91)
  assert.deepEqual(h.calls.at(-1).params,{keyword:'custom',pageNum:1,pageSize:20})
  await h.api.createRole({roleCode:'ROLE_NEW',roleName:'新角色'})
  assert.deepEqual(h.roles.at(-1).permissions,[])
  await h.api.assignUserRoles(91,['ROLE_NEW'])
  assert.deepEqual(h.calls.at(-1).body,{roleCodes:['ROLE_NEW']})
  await h.api.updateRoleDataScope(88,2)
  assert.deepEqual(h.calls.at(-1).body,{dataScope:2})
  const scopes=await h.api.getStudentScopes(91)
  assert.equal(scopes[0].className,'一班')
  await h.api.updateStudentScopes(91,[])
  assert.deepEqual(h.calls.at(-1).body,{scopes:[]})
})
test('saving authorization refreshes current shared session without logging in again',async(t)=>{
  const h=harness();t.after(h.close);await h.ready()
  await h.state.openAssignDialog(h.state.roleList[0]);h.check([])
  await h.state.handleSave()
  assert.ok(h.session.userSession.revision>0)
})

test('data-scope-only administrators load safe selectors without requesting the permission catalog',async(t)=>{
  const h=harness({sessionPermissions:['sys:data-scope:assign']});t.after(h.close);await h.ready()
  assert.ok(h.calls.some(c=>c.url==='/system/roles'))
  assert.ok(h.calls.some(c=>c.url==='/system/users'))
  await h.state.openAssignDialog(h.state.roleList[0])
  assert.equal(h.calls.some(c=>c.url==='/system/permissions'),false)
  await h.state.openUserScopes(h.state.userList[0])
  assert.ok(Array.isArray(h.state.userScopes),'GET scopes must populate a list')
  assert.equal(h.state.userScopes[0].className,'一班')
  h.state.userScopes=[];await h.state.saveUserScopes()
  assert.deepEqual(h.calls.find(c=>c.method==='put').body,{scopes:[]})
})
test('JSON and HTTP 403 responses refresh shared permissions and HTTP 401 removes every cached identity field',async(t)=>{
  for(const type of ['json403','http403','http401']) {
    const h=harness();t.after(h.close);await h.ready()
    h.session.userSession.permissions=['student:resume:edit']
    h.client.defaults.adapter=async config=>{
      if(type==='json403')return {data:{code:403,message:'denied'},status:200,headers:{},config}
      throw Object.assign(new Error('denied'),{response:{status:type==='http403'?403:401,data:{message:'denied'}}})
    }
    await assert.rejects(h.client.get('/protected'))
    await h.ready()
    assert.equal(h.session.userSession.permissions.includes('student:resume:edit'),false)
    assert.ok(h.session.userSession.revision>0)
    if(type==='http401')assert.deepEqual(Array.from(h.session.userSession.roles),[])
  }
})

test('scope editor loads backend Result<List<StudentScopeDTO>> and saves the edited list in the PUT envelope',async(t)=>{
  const h=harness();t.after(h.close);await h.ready()
  await h.state.openUserScopes(h.state.userList[0])
  assert.equal(h.state.userScopesReady,true)
  assert.ok(Array.isArray(h.state.userScopes),'the scope editor must retain the backend array')
  assert.deepEqual(plain(h.state.userScopes),[{department:'信息学院',className:'一班'}])
  h.state.userScopes[0].className='二班'
  h.state.userScopes.push({department:'软件学院',className:'三班'})
  await h.state.saveUserScopes()
  const save=h.calls.find(c=>c.method==='put' && c.url==='/system/users/91/student-scopes')
  assert.deepEqual(save.body,{scopes:[{department:'信息学院',className:'二班'},{department:'软件学院',className:'三班'}]})
  assert.equal(h.state.userScopesVisible,false)
})
