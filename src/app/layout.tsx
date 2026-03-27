import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import AntdProvider from "@/components/layout/AntdProvider";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-family",
});

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
      <body className={ibmPlexSans.className}>
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
