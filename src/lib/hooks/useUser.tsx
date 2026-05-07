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

interface UserContextValue {
  currentUser: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  isLoading: true,
  logout: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 只在客户端挂载时请求一次当前用户信息。
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setCurrentUser(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);

    // App Router 的客户端跳转：先 push，再 refresh，确保依赖用户态的数据一起刷新。
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <UserContext.Provider value={{ currentUser, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
