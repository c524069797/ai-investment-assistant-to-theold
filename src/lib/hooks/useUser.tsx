"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  avatar: string;
}

interface UserContextValue {
  currentUser: User | null;
  users: User[];
  switchUser: (userId: string) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  users: [],
  switchUser: () => {},
  isLoading: true,
});

const CURRENT_USER_KEY = "current-user-id";

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setUsers(json.data);
          const savedId = localStorage.getItem(CURRENT_USER_KEY);
          const found = json.data.find((u: User) => u.id === savedId);
          setCurrentUser(found ?? json.data[0]);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const switchUser = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem(CURRENT_USER_KEY, userId);
        window.dispatchEvent(new Event("user-switched"));
      }
    },
    [users],
  );

  return (
    <UserContext.Provider value={{ currentUser, users, switchUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
