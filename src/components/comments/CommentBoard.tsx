"use client";

import { useEffect, useRef } from "react";

// Waline supports guest comments; we use the public demo server for testing.
// For production, set your own serverURL via env and pass it in.

type Props = {
  serverURL?: string;
  lang?: string;
};

export default function CommentBoard({ serverURL, lang = "zh-CN" }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let instance: any;
    let mounted = true;

    import("@waline/client").then(({ init }) => {
      if (!mounted || !elRef.current) return;
      instance = init({
        el: elRef.current,
        serverURL: serverURL || process.env.NEXT_PUBLIC_WALINE_SERVER_URL || "https://waline.vercel.app",
        lang,
        reaction: true,
        dark: 'html[data-theme="tech-dark"]',
        requiredMeta: [],
        comment: true,
      });
    });

    return () => {
      mounted = false;
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }
    };
  }, [serverURL, lang]);

  return (
    <div className="comment-wrap">
      <div ref={elRef} className="waline" />
    </div>
  );
}

