"use client";

import { useEffect, useRef, useCallback } from "react";

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
        locale: {
          placeholder: "可直接留言，或点击上方模板快速填写…",
        },
      });
    });

    return () => {
      mounted = false;
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }
    };
  }, [serverURL, lang]);

  const fillTemplate = useCallback((type: "teacher" | "course") => {
    const root = elRef.current;
    if (!root) return;
    const textarea = root.querySelector<HTMLTextAreaElement>("textarea");
    if (!textarea) return;

    const teacher = `【需求类型】更新老师观点\n老师姓名：\n想要更新的主题/方向：\n参考链接/来源：\n期望更新时间：\n其他补充：`;
    const course = `【需求类型】更新相关课程\n课程名称：\n章节/模块：\n希望新增/更新的内容：\n参考资料/链接：\n其他补充：`;

    textarea.value = type === "teacher" ? teacher : course;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
  }, []);

  return (
    <div className="comment-wrap">
      <div className="comment-templates" aria-label="快捷留言模板">
        <button className="template-chip" onClick={() => fillTemplate("teacher")}>更新老师观点</button>
        <button className="template-chip" onClick={() => fillTemplate("course")}>更新相关课程</button>
      </div>
      <div ref={elRef} className="waline" />
    </div>
  );
}
