"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "./useUser";

export interface WatchlistItem {
  code: string;
  name: string;
  market: number;
  type: "stock" | "fund";
}

export function useWatchlist() {
  const { currentUser } = useUser();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [version, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/watchlist?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setItems(
            json.data.map((r: { code: string; name: string; market: number; type: string }) => ({
              code: r.code,
              name: r.name,
              market: r.market,
              type: r.type as "stock" | "fund",
            })),
          );
        }
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => setIsLoading(false));
  }, [userId, version]);

  // Re-fetch when user switches
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener("user-switched", handler);
    window.addEventListener("watchlist-update", handler);
    return () => {
      window.removeEventListener("user-switched", handler);
      window.removeEventListener("watchlist-update", handler);
    };
  }, []);

  const addItem = useCallback(
    (item: WatchlistItem) => {
      if (!userId) return;
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...item }),
      }).then(() => {
        setVersion((v) => v + 1);
        window.dispatchEvent(new Event("watchlist-update"));
      });
    },
    [userId],
  );

  const removeItem = useCallback(
    (code: string, type: "stock" | "fund") => {
      if (!userId) return;
      fetch(
        `/api/watchlist?userId=${encodeURIComponent(userId)}&code=${encodeURIComponent(code)}&type=${type}`,
        { method: "DELETE" },
      ).then(() => {
        setVersion((v) => v + 1);
        window.dispatchEvent(new Event("watchlist-update"));
      });
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
