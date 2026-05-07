import ChunkErrorHandler from "@/components/layout/ChunkErrorHandler";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import NavigationAgent from "@/components/layout/NavigationAgent";

export default function AppLayout({
  children,
}: Readonly<{
  // 这里沿用 React + TS 常见的 children 类型写法。
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* 可访问性跳转链接，键盘用户可以直接跳过导航进入主内容。 */}
      <a href="#main-content" className="skip-link">跳到主要内容</a>

      {/*
        Route Group: src/app/(app)
        这一层是登录后的统一壳子布局。
        App Router 会把组内页面自动套进这个 layout，而不会把 (app) 作为 URL 路径的一部分。
      */}
      <ChunkErrorHandler />
      <AppHeader />
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>

      {/* 这两个都是跨页面复用的 Client Component：一个负责智能导航，一个负责底部 tab 导航。 */}
      <NavigationAgent />
      <BottomNav />
    </>
  );
}
