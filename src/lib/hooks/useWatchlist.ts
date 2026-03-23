"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);

  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const loadWatchlist = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/watchlist?userId=${encodeURIComponent(userId)}`);
        const json = await response.json();
        if (!active) return;

        if (json.success) {
          setItems(
            json.data.map((record: { code: string; name: string; market: number; type: string }) => ({
              code: record.code,
              name: record.name,
              market: record.market,
              type: record.type as "stock" | "fund",
            })),
          );
          return;
        }

        setItems([]);
      } catch {
        if (active) {
          setItems([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadWatchlist();

    return () => {
      active = false;
    };
  }, [userId, version]);

  useEffect(() => {
    const handler = () => setVersion((value) => value + 1);
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
        body: JSON.stringify({ userId, code: item.code, type: item.type }),
      }).then(() => {
        setVersion((value) => value + 1);
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
        setVersion((value) => value + 1);
        window.dispatchEvent(new Event("watchlist-update"));
      });
    },
    [userId],
  );

  const isInWatchlist = useCallback(
    (code: string, type: "stock" | "fund") => items.some((item) => item.code === code && item.type === type),
    [items],
  );

  const visibleItems = useMemo(() => (userId ? items : []), [items, userId]);

  return {
    items: visibleItems,
    isLoading: userId ? isLoading : false,
    addItem,
    removeItem,
    isInWatchlist,
  };
}
