import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { userSession } from "@/store/user";
import { listChats, getChatTicket, type ChatItem } from "@/api/chat";
export const conversations = ref<ChatItem[]>([]);
export const chatStatus = ref("正在连接");
export const unreadTotal = computed(() =>
  conversations.value.reduce((n, c) => n + c.unread, 0),
);
let syncing: Promise<void> | null = null,
  syncOwner = "";
export function syncChats() {
  if (!userSession.permissions.includes("chat:view")) {
    conversations.value = [];
    return Promise.resolve();
  }
  const owner = `${localStorage.getItem("token")}:${userSession.userInfo.id}`;
  if (syncing && syncOwner === owner) return syncing;
  syncOwner = owner;
  const pending = listChats()
    .then((items) => {
      if (
        owner ===
          `${localStorage.getItem("token")}:${userSession.userInfo.id}` &&
        userSession.permissions.includes("chat:view")
      )
        conversations.value = items;
    })
    .finally(() => {
      if (syncing === pending) syncing = null;
    });
  syncing = pending;
  return pending;
}
export function useChatConnection() {
  let socket: WebSocket | null = null,
    timer: ReturnType<typeof setTimeout> | undefined,
    poll: ReturnType<typeof setInterval> | undefined,
    heartbeat: ReturnType<typeof setInterval> | undefined;
  let generation = 0,
    attempt = 0,
    active = false,
    expectedToken = "";
  const authorized = () =>
    active &&
    userSession.permissions.includes("chat:view") &&
    !!localStorage.getItem("token");
  function disconnect() {
    generation++;
    clearTimeout(timer);
    timer = undefined;
    clearInterval(heartbeat);
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  }
  async function connect() {
    if (!authorized()) return;
    const version = generation;
    try {
      const { ticket } = await getChatTicket();
      if (version !== generation || !authorized()) return;
      socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/chat/ws?ticket=${encodeURIComponent(ticket)}`,
      );
      socket.onopen = () => {
        attempt = 0;
        chatStatus.value = "实时连接";
        void syncChats().catch(() => {});
        heartbeat = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
        }, 20000);
      };
      socket.onmessage = (e) => {
        try {
          if (JSON.parse(e.data).type === "sync") {
            void syncChats().catch(() => {});
            window.dispatchEvent(new Event("chat-sync"));
          }
        } catch {}
      };
      socket.onclose = () => {
        clearInterval(heartbeat);
        chatStatus.value = "连接恢复中，消息会定期同步";
        if (authorized() && version === generation)
          timer = setTimeout(
            () => void connect(),
            Math.min(30000, 1000 * 2 ** attempt++),
          );
      };
      socket.onerror = () => socket?.close();
    } catch {
      chatStatus.value = "定期同步";
      if (authorized() && version === generation)
        timer = setTimeout(
          () => void connect(),
          Math.min(30000, 1000 * 2 ** attempt++),
        );
    }
  }
  function reconcile() {
    const token = localStorage.getItem("token") || "";
    if (!authorized()) {
      disconnect();
      conversations.value = [];
      return;
    }
    if (token !== expectedToken) {
      expectedToken = token;
      disconnect();
      void connect();
    } else if (!socket && !timer) void connect();
  }
  const stop = watch(
    () => [userSession.permissions.join(","), userSession.userInfo.id],
    reconcile,
  );
  const foreground = () => {
    if (document.visibilityState === "visible") {
      void syncChats().catch(() => {});
      window.dispatchEvent(new Event("chat-sync"));
      reconcile();
    }
  };
  onMounted(() => {
    active = true;
    reconcile();
    void syncChats().catch(() => {});
    poll = setInterval(() => {
      reconcile();
      if (authorized()) {
        void syncChats().catch(() => {});
        window.dispatchEvent(new Event("chat-sync"));
      }
    }, 30000);
    document.addEventListener("visibilitychange", foreground);
  });
  onBeforeUnmount(() => {
    active = false;
    disconnect();
    clearInterval(poll);
    stop();
    conversations.value = [];
    document.removeEventListener("visibilitychange", foreground);
  });
}
