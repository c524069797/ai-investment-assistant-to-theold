export interface ChatPromptHandoff {
  title: string;
  prompt: string;
  createdAt: number;
}

const HANDOFF_KEY_PREFIX = "ai-investment-chat-handoff:";
const HANDOFF_TTL_MS = 10 * 60 * 1000;

const STARTER_PROMPTS: Record<string, Omit<ChatPromptHandoff, "createdAt">> = {
  "research-consensus": {
    title: "大V观点解读",
    prompt: "请帮我整理今天大V观点的共识和分歧，并用通俗方式说明普通投资者最应该关注什么。",
  },
};

function buildHandoffKey(id: string) {
  return `${HANDOFF_KEY_PREFIX}${id}`;
}

function createHandoffId() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `${Date.now().toString(36)}-${randomPart}`;
}

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function createChatHandoffHref(input: Omit<ChatPromptHandoff, "createdAt">) {
  const storage = getStorage();
  if (!storage) {
    return "/chat";
  }

  const id = createHandoffId();
  const handoff: ChatPromptHandoff = {
    title: input.title.trim() || "快捷分析",
    prompt: input.prompt.trim(),
    createdAt: Date.now(),
  };

  storage.setItem(buildHandoffKey(id), JSON.stringify(handoff));
  return `/chat?handoff=${encodeURIComponent(id)}`;
}

export function consumeChatHandoff(id: string): ChatPromptHandoff | null {
  const storage = getStorage();
  if (!storage || !id) return null;

  const key = buildHandoffKey(id);
  const raw = storage.getItem(key);
  storage.removeItem(key);
  if (!raw) return null;

  try {
    const handoff = JSON.parse(raw) as ChatPromptHandoff;
    if (!handoff.prompt || Date.now() - handoff.createdAt > HANDOFF_TTL_MS) {
      return null;
    }
    return handoff;
  } catch {
    return null;
  }
}

export function getChatStarter(starter: string): ChatPromptHandoff | null {
  const item = STARTER_PROMPTS[starter];
  if (!item) return null;

  return {
    ...item,
    createdAt: Date.now(),
  };
}

export function parseChatPromptHref(href: string): Omit<ChatPromptHandoff, "createdAt"> | null {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(href, window.location.origin);
    if (url.pathname !== "/chat") return null;

    const prompt = url.searchParams.get("prompt")?.trim();
    if (!prompt) return null;

    return {
      title: url.searchParams.get("title")?.trim() || "快捷分析",
      prompt,
    };
  } catch {
    return null;
  }
}
