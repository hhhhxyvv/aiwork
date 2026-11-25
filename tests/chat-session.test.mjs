import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript"),
  vue = require("vue");
function harness() {
  const userSession = vue.reactive({
    permissions: ["chat:view"],
    userInfo: { id: 1 },
  });
  let resolve,
    token = "first";
  const waiting = new Promise((r) => {
    resolve = r;
  });
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    localStorage: { getItem: () => token },
  });
  const mod = { exports: {} };
  const js = ts.transpileModule(
    readFileSync(
      new URL("../src/composables/useChatConnection.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.compileFunction(js, ["require", "module", "exports"], {
    parsingContext: context,
  })(
    (name) =>
      name === "vue"
        ? vue
        : name === "@/store/user"
          ? { userSession }
          : { listChats: () => waiting },
    mod,
    mod.exports,
  );
  return {
    ...mod.exports,
    userSession,
    resolve,
    switchUser() {
      token = "second";
      userSession.userInfo.id = 2;
    },
  };
}
test("late conversation response cannot expose previous account conversations", async () => {
  const h = harness(),
    pending = h.syncChats();
  h.switchUser();
  h.resolve([{ unread: 1, peerName: "private" }]);
  await pending;
  assert.equal(h.conversations.value.length, 0);
});
test("permission revocation clears visible conversations", async () => {
  const h = harness();
  h.conversations.value = [{ unread: 3 }];
  h.userSession.permissions = [];
  await h.syncChats();
  assert.equal(h.conversations.value.length, 0);
});
