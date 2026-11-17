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
function harness({ failPermissions = false, failSave = false } = {}) {
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
    console, setTimeout, clearTimeout,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    window: { location: { href: '' } }
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
  const client = evaluate(readFileSync(join(root, 'src/utils/request.ts'), 'utf8'),
    'request.ts', { axios, 'element-plus': { ElMessage: messages } }).default
  // Only the external HTTP transport is replaced; real Axios and interceptors run.
  client.defaults.adapter = async (config) => {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    calls.push({ method: config.method, url: config.url, baseURL: config.baseURL,
      authorization: config.headers.get('Authorization'), body })
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
    '@element-plus/icons-vue': { Key: {}, Folder: {} }, '@/api/permission': api
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
  return { state, roles, calls, notices,
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

test('reads fresh permissions by code and saves them to the selected backend role with PUT', async (t) => {
  const h = harness()
  t.after(h.close)
  await h.ready()
  const role = h.state.roleList.find((role) => (role.id ?? role.roleId) === 4)
  await h.state.openAssignDialog(role)
  assert.deepEqual(h.checked(), ['job:post:publish', 'sys:role:assign'])
  h.check(['sys:role:assign'])
  await h.state.handleSave()
  const save = h.calls.find((call) => call.method === 'put')
  assert.ok(save, 'saving must call the existing PUT endpoint')
  assert.equal(save.url, '/system/roles/4/permissions')
  assert.deepEqual(save.body, { permissions: ['sys:role:assign'] })
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
