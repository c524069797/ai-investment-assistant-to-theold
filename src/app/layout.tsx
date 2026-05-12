import type { Metadata } from "next";
import "./globals.css";
import AntdProvider from "@/components/layout/AntdProvider";

// `Metadata` 是 Next.js 提供的类型，写成 `metadata: Metadata` 后，
// title / description / icons 等字段都会有类型提示和拼写校验。
// metadata 是 Next.js 原生 SEO 能力，放在 layout.tsx 后会自动注入到 <head>。
export const metadata: Metadata = {
  title: "A股智能投资助手",
  description: "聚焦A股市场的智能投资助手，提供沪深行情、策略筛选、AI问答与投资教学",
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  // `React.ReactNode` 表示这个插槽既可以接 JSX，也可以接字符串、Fragment、数组等 React 可渲染内容。
  children: React.ReactNode;
}>) {
  // `Readonly<...>` 是一个常见 TS 手法：表达“props 只读，不应该在组件内被修改”。
  return (
    <html lang="zh-CN">
      <body>
        {/*
          AntdProvider 是全局技术底座：
          1. 注入 Ant Design ConfigProvider
          2. 注入 App Router 场景下的样式注册器
          3. 提供主题 / 字号 / 当前用户上下文
        */}
        <AntdProvider>{children}</AntdProvider>
      </body>
    </html>
  );
}
