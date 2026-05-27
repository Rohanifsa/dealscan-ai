import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { AgentChat } from "@/features/agent/components/AgentChat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <BriefcaseBusiness className="text-primary size-5" />
            <span>DealScan AI</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1">{children}</div>
      <AgentChat />
    </div>
  );
}
