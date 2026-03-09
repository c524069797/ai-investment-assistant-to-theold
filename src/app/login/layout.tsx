import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 - A股智能投资助手",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
