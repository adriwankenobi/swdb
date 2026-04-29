import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { EraTabs } from "./EraTabs";

interface AppShellProps {
  children: ReactNode;
  onHome?: () => void;
}

export function AppShell({ children, onHome }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar onHome={onHome} />
      <EraTabs />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
