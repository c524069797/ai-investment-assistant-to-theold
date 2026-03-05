import type { Metadata } from "next";
import "./globals.css";
import AntdProvider from "@/components/layout/AntdProvider";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "智能投资助手 - AI Investment Assistant",
  description: "面向中老年投资者的 AI 智能投资助手，提供 A 股行情、基金数据、AI 问答和投资教学",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>
          <AppHeader />
          <main className="main-content">{children}</main>
          <BottomNav />
        </AntdProvider>
      </body>
    </html>
  );
}
