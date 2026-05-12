"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { createChatHandoffHref, parseChatPromptHref } from "@/lib/chat/handoff";

interface ChatHandoffLinkProps {
  title?: string;
  prompt?: string;
  href?: string;
  className?: string;
  children: ReactNode;
}

export default function ChatHandoffLink({
  title,
  prompt,
  href = "/chat",
  className,
  children,
}: ChatHandoffLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const handoff = prompt?.trim()
      ? { title: title?.trim() || "快捷分析", prompt: prompt.trim() }
      : parseChatPromptHref(href);

    if (!handoff?.prompt) return;

    event.preventDefault();
    router.push(createChatHandoffHref(handoff));
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
