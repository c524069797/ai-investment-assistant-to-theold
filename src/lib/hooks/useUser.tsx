"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
