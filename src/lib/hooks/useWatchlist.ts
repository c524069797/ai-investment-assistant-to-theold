"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface WatchlistItem {
  code: string;
  name: string;
  market: number;
  type: "stock" | "fund";
}

const STORAGE_KEY = "investment-watchlist";

function getSnapshot(): WatchlistItem[] {
  if (typeof window === "undefined") return EMPTY_LIST;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY_LIST;
  } catch {
    return EMPTY_LIST;
  }
}

const EMPTY_LIST: WatchlistItem[] = [];

function getServerSnapshot(): WatchlistItem[] {
  return EMPTY_LIST;
}

function subscribe(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  // Custom event for same-tab updates
  const customHandler = () => callback();

  window.addEventListener("storage", handler);
  window.addEventListener("watchlist-update", customHandler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("watchlist-update", customHandler);
  };
}

function notifyUpdate() {
  window.dispatchEvent(new Event("watchlist-update"));
}

export function useWatchlist() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((item: WatchlistItem) => {
    const current = getSnapshot();
    const exists = current.some((i) => i.code === item.code && i.type === item.type);
    if (exists) return;
    const updated = [...current, item];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyUpdate();
  }, []);

  const removeItem = useCallback((code: string, type: "stock" | "fund") => {
    const current = getSnapshot();
    const updated = current.filter((i) => !(i.code === code && i.type === type));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    notifyUpdate();
  }, []);

  const isInWatchlist = useCallback(
    (code: string, type: "stock" | "fund") => {
      return items.some((i) => i.code === code && i.type === type);
    },
    [items],
  );

  return { items, addItem, removeItem, isInWatchlist };
}
