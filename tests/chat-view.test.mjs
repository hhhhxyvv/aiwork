import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
const require = createRequire(import.meta.url),
  ts = require("typescript"),
  vue = require("vue"),
  { parse, compileScript } = require("@vue/compiler-sfc");
const tick = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}
function harness() {
  const calls = [],
    initial = deferred(),
    sending = deferred();
  let first = true;
  const item = {
    conversation: {
      id: 1,
      studentUserId: 1,
      hrUserId: 2,
      studentReadId: 0,
      hrReadId: 0,
    },
    job: { jobTitle: "Java" },
    unread: 0,
  };
  const api = {
    listMessages: async (id, params) => {
      calls.push(params);
      if (first) {
        first = false;
        return initial.promise;
      }
      return [];
    },
    sendMessage: () => sending.promise,
    markRead: async () => {},
    listApplications: async () => [],
  };
  const source = compileScript(
    parse(
      readFileSync(
        new URL("../src/views/chat/index.vue", import.meta.url),
        "utf8",
      ),
    ).descriptor,
    { id: "chat-test" },
  ).content;
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = { exports: {} },
    events = new EventTarget(),
    doc = new EventTarget();
  doc.visibilityState = "visible";
  const context = vm.createContext({
    console,
    window: events,
    document: doc,
    crypto: webcrypto,
    Event,
    Map,
    Set,
  });
  vm.compileFunction(js, ["require", "module", "exports"], {
    parsingContext: context,
  })(
    (name) => {
      if (name === "vue") return vue;
      if (name === "vue-router")
        return {
          useRoute: () => ({ query: {} }),
          useRouter: () => ({ replace: async () => {} }),
        };
      if (name === "@/store/user")
        return { userSession: { userInfo: { id: 1 } } };
      if (name === "@/utils/permission")
        return {
          hasPermission: (code) => code === "chat:view" || code === "chat:send",
        };
      if (name === "@/composables/useChatConnection")
        return {
          conversations: vue.ref([item]),
          unreadTotal: vue.ref(0),
          chatStatus: vue.ref("test"),
          syncChats: async () => {},
        };
      if (name === "@/api/chat") return api;
      if (name === "@/utils/request")
        return { get: async () => ({ records: [] }) };
      if (name === "element-plus")
        return { ElMessage: { info() {}, warning() {}, success() {} } };
      throw Error(name);
    },
    mod,
    mod.exports,
  );
  const renderer = vue.createRenderer({
    patchProp() {},
    insert() {},
    remove() {},
    setText() {},
    setElementText() {},
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    parentNode: () => null,
    nextSibling: () => null,
  });
  const app = renderer.createApp({
    ...mod.exports.default,
    render: () => null,
  });
  app.mount({});
  return {
    state: app._instance.setupState,
    calls,
    initial,
    sending,
    close: () => app.unmount(),
  };
}
test("initial history load and incremental synchronization do not overlap", async () => {
  const h = harness();
  await tick();
  const select = h.state.select(1);
  await tick();
  await h.state.syncMessages();
  assert.equal(h.calls.length, 1);
  h.initial.resolve([{ id: 100, senderId: 2 }]);
  await select;
  assert.deepEqual(
    Array.from(h.state.messages, (m) => m.id),
    [100],
  );
  h.close();
});
test("typing next draft while sending does not lose the new text", async () => {
  const h = harness();
  await tick();
  const select = h.state.select(1);
  await tick();
  h.initial.resolve([]);
  await select;
  h.state.draft = "first";
  const send = h.state.send();
  await tick();
  h.state.draft = "next draft";
  h.sending.resolve({ id: 1 });
  await send;
  assert.equal(h.state.draft, "next draft");
  h.close();
});
