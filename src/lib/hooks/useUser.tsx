"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// 这是典型的“客户端会话上下文”写法：
// - 首屏仍由服务端 cookie 控制访问权限
// - 进入应用后，用 React Context 缓存当前用户，避免每个组件都重复请求 /api/auth/me

export interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

const USER_CACHE_KEY = "ai-investment-assistant-current-user";
const BRIEFING_SESSION_PREFIX = "ai-investment-assistant-daily-briefing";

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["id", "username", "name", "avatar"].every((key) => typeof record[key] === "string");
}

function readCachedUser(): User | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return isUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function cacheCurrentUser(user: User | null) {
  if (typeof window === "undefined") return;

  if (!user) {
    window.localStorage.removeItem(USER_CACHE_KEY);
    return;
  }

  window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function clearBriefingSessionFlags(userId?: string) {
  if (typeof window === "undefined") return;

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith(BRIEFING_SESSION_PREFIX)) continue;
    if (userId && !key.includes(`:${userId}:`)) continue;
    window.sessionStorage.removeItem(key);
  }
}

interface UserContextValue {
  currentUser: User | null;
  isLoading: boolean;
  isGuest: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  isLoading: true,
  isGuest: true,
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => readCachedUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(readCachedUser()));
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // 无缓存时先以游客态渲染，再后台确认；有缓存时先显示缓存身份，再校验 session 是否仍有效。
    fetch("/api/auth/me", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;

        if (json.success && isUser(json.data)) {
          setCurrentUser(json.data);
          cacheCurrentUser(json.data);
          return;
        }

        setCurrentUser(null);
        cacheCurrentUser(null);
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const today = new Date().toISOString().slice(0, 10);
    const sessionKey = `${BRIEFING_SESSION_PREFIX}:${currentUser.id}:${today}`;

    if (window.sessionStorage.getItem(sessionKey)) {
      return;
    }

    window.sessionStorage.setItem(sessionKey, "pending");

    fetch("/api/agents/daily-briefing", { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          window.sessionStorage.setItem(sessionKey, "completed");
          window.dispatchEvent(new CustomEvent("daily-briefing-ready", { detail: json.data }));
          return;
        }

        window.sessionStorage.removeItem(sessionKey);
      })
      .catch(() => {
        window.sessionStorage.removeItem(sessionKey);
      });
  }, [currentUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearBriefingSessionFlags(currentUser?.id);
      setCurrentUser(null);
      cacheCurrentUser(null);
      window.dispatchEvent(new Event("user-switched"));
    }

    // 退出后保留浏览能力，回到游客首页而不是强制卡在登录页。
    router.push("/?mode=guest");
    router.refresh();
  }, [currentUser?.id, router]);

  return (
    <UserContext.Provider value={{ currentUser, isLoading, isGuest: !isLoading && !currentUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
