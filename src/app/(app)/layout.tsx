import ChunkErrorHandler from "@/components/layout/ChunkErrorHandler";
import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import NavigationAgent from "@/components/layout/NavigationAgent";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a href="#main-content" className="skip-link">跳到主要内容</a>
      <ChunkErrorHandler />
      <AppHeader />
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <NavigationAgent />
      <BottomNav />
    </>
  );
}
