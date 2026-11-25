<template>
  <div class="chat-page">
    <header class="heading">
      <div>
        <h2>招聘消息</h2>
        <span class="muted">每个岗位，独立沟通 · {{ chatStatus }}</span>
      </div>
      <el-button v-if="hasPermission('chat:settings')" @click="showSettings"
        >离线自动回复</el-button
      >
    </header>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    />
    <div class="chat-layout" :class="{ 'has-selection': selected }">
      <aside class="conversation-list">
        <div class="list-title">
          会话
          <el-badge :value="unreadTotal" :hidden="!unreadTotal" /><el-button
            link
            @click="load"
            >刷新</el-button
          >
        </div>
        <el-empty
          v-if="!conversations.length"
          description="投递后即可在这里沟通"
          :image-size="70"
        />
        <button
          v-for="item in conversations"
          :key="item.conversation.id"
          class="conversation"
          :class="{ active: selected === item.conversation.id }"
          @click="select(item.conversation.id)"
        >
          <div>
            <strong>{{ item.peerName }}</strong
            ><el-badge :value="item.unread" :hidden="!item.unread" />
          </div>
          <p>{{ item.job.jobTitle }}</p>
          <small>{{ item.lastMessage?.content || "开始沟通吧" }}</small>
        </button>
        <details v-if="applications.length">
          <summary>我的投递 · 继续沟通</summary>
          <button
            v-for="app in applications"
            :key="app.applicationId"
            class="application"
            :disabled="app.publisherRole !== 'HR'"
            @click="openApplication(app.applicationId)"
          >
            {{ app.jobTitle }}
            <small>{{
              app.publisherRole === "HR" ? "进入会话" : "暂不支持 HR 聊天"
            }}</small>
          </button>
        </details>
        <details v-if="applicants.length">
          <summary>投递候选人</summary>
          <button
            v-for="app in applicants"
            :key="app.applicationId"
            class="application"
            @click="openApplication(app.applicationId)"
          >
            {{ app.realName }} · {{ app.jobTitle }}
          </button>
        </details>
      </aside>
      <section class="thread" v-if="current">
        <div class="thread-header">
          <el-button class="back" link @click="selected = 0">返回列表</el-button
          ><strong>{{ current.peerName }}</strong
          ><span class="muted"
            >{{ current.peerOnline ? "在线" : "离线" }} ·
            {{ current.job.jobTitle }}</span
          >
        </div>
        <div class="messages" ref="messagePane" @scroll="onScroll">
          <el-button v-if="hasOlder" link :loading="loadingOlder" @click="older"
            >加载更早消息</el-button
          ><el-empty
            v-if="!messages.length"
            description="还没有消息，打个招呼吧"
            :image-size="65"
          />
          <div
            v-for="m in messages"
            :key="m.id"
            class="message-row"
            :class="{ mine: m.senderId === userId }"
          >
            <div class="message">
              <small
                >{{ m.type === "AUTO_REPLY" ? "自动回复 · " : ""
                }}{{ formatTime(m.createdAt) }}</small
              >
              <div class="bubble">{{ m.content }}</div>
              <small v-if="m.senderId === userId">{{
                m.id <=
                (current.conversation.studentUserId === userId
                  ? current.conversation.hrReadId
                  : current.conversation.studentReadId)
                  ? "已读"
                  : "已发送"
              }}</small>
            </div>
          </div>
        </div>
        <form class="composer" @submit.prevent="send">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="3"
            :maxlength="2000"
            show-word-limit
            placeholder="围绕岗位和简历聊一聊（Ctrl + Enter 发送）"
            :disabled="!hasPermission('chat:send')"
            @keydown.ctrl.enter.prevent="send"
          />
          <div class="composer-actions">
            <span class="muted">{{
              pending ? "发送未确认，可重试原消息" : "消息仅对双方可见"
            }}</span
            ><el-button
              type="primary"
              native-type="submit"
              :loading="sending"
              :disabled="!draft.trim() || !hasPermission('chat:send')"
              >{{ pending ? "重试发送" : "发送" }}</el-button
            >
          </div>
        </form>
      </section>
      <section class="thread empty-thread" v-else>
        <el-empty description="选择一个会话，开始沟通" />
      </section>
      <aside class="context" v-if="current">
        <h3>沟通岗位</h3>
        <h4>{{ current.job.jobTitle }}</h4>
        <p>{{ current.job.city }}</p>
        <p class="salary">
          {{ current.job.minSalary }}–{{ current.job.maxSalary }} 元/月
        </p>
        <p class="requirements">
          {{ current.job.requirements || "暂无岗位说明" }}
        </p>
        <el-divider />
        <h3>投递简历</h3>
        <p>关联简历 #{{ current.conversation.resumeId }}</p>
        <el-button v-if="canReadResume" @click="showResume"
          >查看投递简历</el-button
        >
      </aside>
    </div>
    <el-dialog
      v-model="settingVisible"
      title="离线自动回复"
      width="min(520px,95vw)"
      ><p class="muted">
        所有设备离线后自动回复，同一岗位会话每 30 分钟最多一次。
      </p>
      <el-switch
        v-model="setting.enabled"
        active-text="启用自动回复"
      /><el-input
        v-model="setting.content"
        class="setting-input"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
        placeholder="例如：你好，消息已收到，我上线后会尽快回复。"
      /><template #footer
        ><el-button @click="settingVisible = false">取消</el-button
        ><el-button
          type="primary"
          :loading="savingSetting"
          @click="saveSettings"
          >保存</el-button
        ></template
      ></el-dialog
    >
    <el-dialog
      v-model="resumeVisible"
      :title="resume.title"
      width="min(720px,95vw)"
    >
      <pre class="resume-content">{{ resume.content || "暂无可展示内容" }}</pre>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { userSession } from "@/store/user";
import { hasPermission } from "@/utils/permission";
import request from "@/utils/request";
import {
  conversations,
  unreadTotal,
  chatStatus,
  syncChats,
} from "@/composables/useChatConnection";
import {
  listMessages,
  sendMessage,
  markRead,
  openChat,
  listApplications,
  getSetting,
  saveSetting,
  getChatResume,
  type Message,
  type Application,
} from "@/api/chat";
const route = useRoute(),
  router = useRouter(),
  selected = ref(0),
  messages = ref<Message[]>([]),
  draft = ref(""),
  error = ref(""),
  sending = ref(false),
  hasOlder = ref(false),
  loadingOlder = ref(false),
  messagePane = ref<HTMLElement>(),
  applications = ref<Application[]>([]),
  applicants = ref<
    { applicationId: number; realName: string; jobTitle: string }[]
  >([]);
const userId = computed(() => Number(userSession.userInfo.id)),
  current = computed(() =>
    conversations.value.find((i) => i.conversation.id === selected.value),
  ),
  canReadResume = computed(() =>
    current.value?.conversation.studentUserId === userId.value
      ? hasPermission("student:profile:view")
      : hasPermission("resume:candidate:view"),
  );
const pending = ref<{
  id: string;
  content: string;
  conversation: number;
} | null>(null);
const pendingByConversation = new Map<
  number,
  { id: string; content: string; conversation: number }
>();
const drafts = new Map<number, string>();
let syncing = false,
  stopped = false,
  selectionEpoch = 0,
  loadingConversation = false;
const settingVisible = ref(false),
  savingSetting = ref(false),
  setting = ref({ enabled: false, content: "" }),
  resumeVisible = ref(false),
  resume = ref({ title: "投递简历", content: "" });
const formatTime = (s: string) =>
  new Date(s).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
async function readVisible() {
  if (
    !current.value ||
    document.visibilityState !== "visible" ||
    !messages.value.length
  )
    return;
  const pane = messagePane.value;
  if (pane && pane.scrollHeight - pane.scrollTop - pane.clientHeight > 100)
    return;
  const id = selected.value,
    last = messages.value.at(-1)!.id,
    own =
      current.value.conversation.studentUserId === userId.value
        ? "studentReadId"
        : "hrReadId";
  if (last > current.value.conversation[own]) {
    await markRead(id, last);
    if (current.value && current.value.conversation.id === id) {
      current.value.conversation[own] = last;
      current.value.unread = 0;
    }
  }
}
async function bottom() {
  await nextTick();
  if (messagePane.value)
    messagePane.value.scrollTop = messagePane.value.scrollHeight;
  await readVisible();
}
async function select(id: number) {
  if (sending.value) {
    ElMessage.info("请等待当前消息发送完成");
    return;
  }
  const epoch = ++selectionEpoch;
  loadingConversation = true;
  drafts.set(selected.value, draft.value);
  selected.value = id;
  draft.value = drafts.get(id) || "";
  messages.value = [];
  pending.value = pendingByConversation.get(id) || null;
  error.value = "";
  try {
    await router.replace({ query: { conversation: id } });
    const result = await listMessages(id);
    if (epoch !== selectionEpoch || stopped) return;
    messages.value = result;
    hasOlder.value = result.length === 50;
    await bottom();
  } catch {
    if (epoch === selectionEpoch) error.value = "消息加载失败，请刷新重试";
  } finally {
    if (epoch === selectionEpoch) {
      loadingConversation = false;
      if (!stopped) void syncMessages();
    }
  }
}
async function syncMessages() {
  if (syncing || loadingConversation || !selected.value || stopped) return;
  syncing = true;
  const id = selected.value,
    epoch = selectionEpoch;
  try {
    let cursor = messages.value.at(-1)?.id || 0;
    let page: Message[];
    do {
      page = await listMessages(id, { afterId: cursor, limit: 100 });
      if (selected.value !== id || epoch !== selectionEpoch || stopped) return;
      const pane = messagePane.value,
        atBottom =
          !pane || pane.scrollHeight - pane.scrollTop - pane.clientHeight < 100;
      const ids = new Set(messages.value.map((m) => m.id));
      messages.value.push(...page.filter((m) => !ids.has(m.id)));
      messages.value.sort((a, b) => a.id - b.id);
      if (page.length) cursor = page.at(-1)!.id;
      if (atBottom) await bottom();
    } while (page.length === 100);
    await readVisible();
  } catch {
    error.value = "消息同步暂时失败，将自动重试";
  } finally {
    syncing = false;
  }
}
async function load() {
  try {
    await syncChats();
    await syncMessages();
    error.value = "";
  } catch {
    error.value = "无法加载会话，请检查连接后重试";
  }
}
async function older() {
  if (!messages.value.length) return;
  loadingOlder.value = true;
  const id = selected.value,
    pane = messagePane.value,
    height = pane?.scrollHeight || 0;
  try {
    const page = await listMessages(id, { beforeId: messages.value[0]!.id });
    if (selected.value !== id) return;
    messages.value.unshift(...page);
    hasOlder.value = page.length === 50;
    await nextTick();
    if (pane) pane.scrollTop = pane.scrollHeight - height;
  } finally {
    loadingOlder.value = false;
  }
}
async function send() {
  if (sending.value || !draft.value.trim() || !selected.value) return;
  if (pending.value && pending.value.content !== draft.value) {
    ElMessage.warning("请先重试原消息，确认发送结果后再编辑");
    return;
  }
  const item = pending.value || {
    id: crypto.randomUUID(),
    content: draft.value,
    conversation: selected.value,
  };
  pending.value = item;
  pendingByConversation.set(item.conversation, item);
  sending.value = true;
  try {
    await sendMessage(item.conversation, item.id, item.content);
    if (draft.value === item.content) {
      draft.value = "";
      drafts.delete(item.conversation);
    } else {
      drafts.set(item.conversation, draft.value);
    }
    pendingByConversation.delete(item.conversation);
    pending.value = null;
    await load();
    await bottom();
  } catch {
    error.value = "发送未确认，点击重试可避免重复发送";
  } finally {
    sending.value = false;
  }
}
async function openApplication(id: number) {
  try {
    const c = await openChat(id);
    await syncChats();
    await select(c.id);
  } catch {
    error.value = "无法打开该投递的会话";
  }
}
async function showSettings() {
  try {
    setting.value = await getSetting();
    settingVisible.value = true;
  } catch {}
}
async function saveSettings() {
  if (setting.value.enabled && !setting.value.content.trim()) {
    ElMessage.warning("请填写回复文案");
    return;
  }
  savingSetting.value = true;
  try {
    await saveSetting(setting.value);
    settingVisible.value = false;
    ElMessage.success("已保存自动回复设置");
  } finally {
    savingSetting.value = false;
  }
}
async function showResume() {
  try {
    resume.value = await getChatResume(selected.value);
    resumeVisible.value = true;
  } catch {}
}
const onScroll = () => {
    void readVisible().catch(() => {});
  },
  onSync = () => void syncMessages(),
  foreground = () => {
    if (document.visibilityState === "visible") void syncMessages();
  };
onMounted(async () => {
  window.addEventListener("chat-sync", onSync);
  document.addEventListener("visibilitychange", foreground);
  await load();
  try {
    applications.value = await listApplications();
    if (hasPermission("resume:candidate:view")) {
      const page = (await request.get("/job/hr/applicants", {
        params: { pageSize: 100 },
      })) as any;
      applicants.value = page.records || [];
    }
  } catch {}
  const id = Number(route.query.conversation);
  if (id && conversations.value.some((i) => i.conversation.id === id))
    await select(id);
});
watch(
  () => route.query.conversation,
  (id) => {
    const n = Number(id);
    if (
      n &&
      n !== selected.value &&
      conversations.value.some((i) => i.conversation.id === n)
    )
      void select(n);
  },
);
onBeforeUnmount(() => {
  stopped = true;
  window.removeEventListener("chat-sync", onSync);
  document.removeEventListener("visibilitychange", foreground);
});
</script>
<style scoped>
.chat-page {
  padding: 20px;
  max-width: 1600px;
  margin: auto;
}
.heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.heading h2 {
  margin: 0 0 6px;
}
.muted {
  color: #7c899a;
  font-size: 13px;
}
.chat-layout {
  display: grid;
  grid-template-columns: 260px minmax(300px, 1fr) 250px;
  height: calc(100vh - 190px);
  min-height: 480px;
  background: white;
  border: 1px solid #e5eaf1;
  border-radius: 12px;
  overflow: hidden;
}
.conversation-list {
  overflow: auto;
  border-right: 1px solid #e5eaf1;
}
.list-title {
  padding: 18px;
  display: flex;
  gap: 15px;
  align-items: center;
}
.conversation {
  display: block;
  width: 100%;
  border: 0;
  background: white;
  text-align: left;
  padding: 18px;
  cursor: pointer;
  border-bottom: 1px solid #f0f3f7;
}
.conversation:hover,
.conversation.active {
  background: #edf6ff;
}
.conversation > div {
  display: flex;
  justify-content: space-between;
}
.conversation p {
  margin: 8px 0;
  color: #477099;
}
.conversation small {
  display: block;
  color: #8792a0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.thread-header {
  padding: 18px;
  border-bottom: 1px solid #edf0f4;
  display: flex;
  gap: 14px;
  align-items: center;
  flex-wrap: wrap;
}
.messages {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: #f8fafc;
}
.message-row {
  display: flex;
  margin-bottom: 18px;
}
.message-row.mine {
  justify-content: flex-end;
}
.message {
  max-width: 85%;
}
.message small {
  font-size: 11px;
  color: #8390a2;
  display: block;
  margin: 5px 2px;
}
.bubble {
  background: white;
  border: 1px solid #e5eaf1;
  border-radius: 10px;
  padding: 12px 15px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.6;
}
.mine .bubble {
  background: #e3f0ff;
  border-color: #cfe4ff;
}
.composer {
  padding: 15px;
  border-top: 1px solid #e5eaf1;
}
.composer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.context {
  padding: 22px;
  border-left: 1px solid #edf0f4;
  overflow: auto;
}
.context h3 {
  font-size: 14px;
  color: #8290a2;
}
.salary {
  color: #2878ce;
}
.requirements {
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.empty-thread {
  justify-content: center;
}
.back {
  display: none;
}
.application {
  background: none;
  border: 0;
  display: block;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.application small {
  color: #8792a0;
}
details {
  padding: 16px 8px;
  border-top: 1px solid #edf0f4;
}
summary {
  cursor: pointer;
  color: #477099;
}
.setting-input {
  margin-top: 20px;
}
.resume-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: inherit;
  line-height: 1.8;
}
@media (max-width: 1100px) {
  .chat-layout {
    grid-template-columns: 240px 1fr;
  }
  .context {
    display: none;
  }
}
@media (max-width: 700px) {
  .chat-page {
    padding: 8px;
  }
  .heading {
    gap: 10px;
  }
  .heading h2 {
    font-size: 19px;
  }
  .chat-layout {
    display: block;
    height: calc(100dvh - 175px);
    min-height: 400px;
  }
  .conversation-list {
    height: 100%;
  }
  .thread {
    display: none;
    height: 100%;
  }
  .has-selection .conversation-list {
    display: none;
  }
  .has-selection .thread {
    display: flex;
  }
  .back {
    display: inline-flex;
  }
  .heading .muted {
    font-size: 11px;
  }
}
</style>
