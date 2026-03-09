import type { Metadata } from "next";
import "./globals.css";
import AntdProvider from "@/components/layout/AntdProvider";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "A股智能投资助手",
  description: "聚焦A股市场的智能投资助手，提供沪深行情、策略筛选、AI问答与投资教学",
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
