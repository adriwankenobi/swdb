import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { EraTabs } from "./EraTabs";
import { MediumTabs } from "./MediumTabs";
import { YearRangeFilter } from "@/components/filters/YearRangeFilter";
import { ReleaseRangeFilter } from "@/components/filters/ReleaseRangeFilter";

interface AppShellProps {
  children: ReactNode;
  onHome?: () => void;
}

export function AppShell({ children, onHome }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar onHome={onHome} />
      <EraTabs />
      <div className="flex flex-wrap items-center gap-4 border-b px-4 py-2">
        <div className="flex-1 min-w-0">
          <MediumTabs />
        </div>
        <div className="shrink-0">
          <YearRangeFilter />
        </div>
        <div className="shrink-0">
          <ReleaseRangeFilter />
        </div>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </div>
    </div>
  );
}
