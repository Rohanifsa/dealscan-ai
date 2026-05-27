"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Ticket,
  Clock,
  Mail,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Red Flags", href: "/discrepancies", icon: ClipboardCheck },
  { label: "Queries", href: "/tickets", icon: Ticket },
  { label: "Emails", href: "/emails", icon: Mail },
  { label: "Audit", href: "/audit", icon: Clock },
];

interface WorkflowNavProps {
  workflowId: string;
}

export function WorkflowNav({ workflowId }: WorkflowNavProps) {
  const pathname = usePathname();
  const base = `/workflow/${workflowId}`;

  return (
    <Sidebar
      collapsible="none"
      className="sticky top-14 h-[calc(100svh-3.5rem)] border-r bg-sidebar"
    >
      <SidebarContent>
        <SidebarGroup className="pt-2">
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const href = `${base}${item.href}`;
              const isActive =
                item.href === ""
                  ? pathname === base
                  : pathname.startsWith(href);
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
