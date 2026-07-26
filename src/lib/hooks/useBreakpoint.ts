"use client";

import { useSyncExternalStore } from "react";

/**
 * 全站统一断点，必须和 globals.css 里的 @media 值保持一致：
 * - MOBILE_MAX  : <768px  纯移动端（单列、卡片化、适老大控件）
 * - DESKTOP_MIN : >=1024px 桌面科技风轨道（紧凑网格）
 * 768~1023px 属于平板过渡区：布局按桌面排，但密度仍走 comfortable。
 */
export const MOBILE_MAX = 767;
export const DESKTOP_MIN = 1024;

const QUERIES = {
  mobile: `(max-width: ${MOBILE_MAX}px)`,
  desktop: `(min-width: ${DESKTOP_MIN}px)`,
} as const;

type QueryKey = keyof typeof QUERIES;

// 每个媒体查询共享一个 MediaQueryList，避免每个组件都新建监听。
const mqlCache = new Map<string, MediaQueryList>();

function getMql(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  const cached = mqlCache.get(query);
  if (cached) {
    return cached;
  }

  const mql = window.matchMedia(query);
  mqlCache.set(query, mql);
  return mql;
}

function subscribe(query: string) {
  return (onChange: () => void) => {
    const mql = getMql(query);
    if (!mql) {
      return () => {};
    }

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/**
 * 服务端渲染时统一返回 false，客户端 hydrate 后再校正。
 * 这样 SSR 输出恒定，不会触发 hydration mismatch。
 */
function useMediaQuery(key: QueryKey): boolean {
  const query = QUERIES[key];

  return useSyncExternalStore(
    subscribe(query),
    () => getMql(query)?.matches ?? false,
    () => false,
  );
}

/** 是否窄屏移动端（<768px）。SSR 期间为 false。 */
export function useIsMobile(): boolean {
  return useMediaQuery("mobile");
}

/** 是否桌面宽屏（>=1024px），用于切换紧凑密度。SSR 期间为 false。 */
export function useIsDesktop(): boolean {
  return useMediaQuery("desktop");
}
