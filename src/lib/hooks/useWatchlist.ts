"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "./useUser";

export interface WatchlistItem {
  code: string;
  name: string;
  market: number;
  type: "stock" | "fund";
}

function getStorageKey(userId: string): string {
  return `watchlist-${userId}`;
}

function readWatchlist(userId: string): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeWatchlist(userId: string, items: WatchlistItem[]) {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
}

export function useWatchlist() {
  const { currentUser } = useUser();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = currentUser?.id;

  // Load from localStorage
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setItems(readWatchlist(userId));
    setIsLoading(false);
  }, [userId]);

  // Re-sync on user-switched or watchlist-update events
  useEffect(() => {
    const handler = () => {
      if (userId) {
        setItems(readWatchlist(userId));
      }
    };
    window.addEventListener("user-switched", handler);
    window.addEventListener("watchlist-update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("user-switched", handler);
      window.removeEventListener("watchlist-update", handler);
      window.removeEventListener("storage", handler);
    };
  }, [userId]);

  const addItem = useCallback(
    (item: WatchlistItem) => {
      if (!userId) return;
      const current = readWatchlist(userId);
      const exists = current.some((i) => i.code === item.code && i.type === item.type);
      if (exists) return;
      const updated = [...current, item];
      writeWatchlist(userId, updated);
      setItems(updated);
      window.dispatchEvent(new Event("watchlist-update"));
    },
    [userId],
  );

  const removeItem = useCallback(
    (code: string, type: "stock" | "fund") => {
      if (!userId) return;
      const current = readWatchlist(userId);
      const updated = current.filter((i) => !(i.code === code && i.type === type));
      writeWatchlist(userId, updated);
      setItems(updated);
      window.dispatchEvent(new Event("watchlist-update"));
    },
    [userId],
  );

  const isInWatchlist = useCallback(
    (code: string, type: "stock" | "fund") => {
      return items.some((i) => i.code === code && i.type === type);
    },
    [items],
  );

  return { items, isLoading, addItem, removeItem, isInWatchlist };
}
