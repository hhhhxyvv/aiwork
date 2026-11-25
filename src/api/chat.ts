import request from "@/utils/request";
export interface Conversation {
  id: number;
  applicationId: number;
  studentUserId: number;
  hrUserId: number;
  jobId: number;
  resumeId: number;
  studentReadId: number;
  hrReadId: number;
}
export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  clientMessageId: string;
  content: string;
  type: "TEXT" | "AUTO_REPLY";
  createdAt: string;
}
export interface ChatItem {
  conversation: Conversation;
  unread: number;
  job: {
    id: number;
    jobTitle: string;
    city: string;
    requirements: string;
    minSalary: number;
    maxSalary: number;
  };
  peerName: string;
  peerOnline: boolean;
  lastMessage: Message | null;
}
export interface Application {
  applicationId: number;
  jobId: number;
  jobTitle: string;
  publisherRole: string;
  status: number;
}
export interface Setting {
  enabled: boolean;
  content: string;
}
export const listChats = () =>
  request.get("/chat/conversations") as unknown as Promise<ChatItem[]>;
export const openChat = (applicationId: number) =>
  request.post("/chat/conversations/open", {
    applicationId,
  }) as unknown as Promise<Conversation>;
export const listApplications = () =>
  request.get("/chat/applications") as unknown as Promise<Application[]>;
export const listMessages = (
  id: number,
  params: { afterId?: number; beforeId?: number; limit?: number } = {},
) =>
  request.get(`/chat/conversations/${id}/messages`, {
    params,
  }) as unknown as Promise<Message[]>;
export const sendMessage = (
  id: number,
  clientMessageId: string,
  content: string,
) =>
  request.post(`/chat/conversations/${id}/messages`, {
    clientMessageId,
    content,
  }) as unknown as Promise<Message>;
export const markRead = (id: number, messageId: number) =>
  request.put(`/chat/conversations/${id}/read`, { messageId });
export const getSetting = () =>
  request.get("/chat/settings") as unknown as Promise<Setting>;
export const saveSetting = (setting: Setting) =>
  request.put("/chat/settings", setting);
export const getChatResume = (id: number) =>
  request.get(`/chat/conversations/${id}/resume`) as unknown as Promise<{
    title: string;
    content: string;
  }>;
export const getChatTicket = () =>
  request.post("/chat/ticket") as unknown as Promise<{ ticket: string }>;
