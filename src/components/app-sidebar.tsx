"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Anchor, Ship, Settings, Warehouse } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "./ui/separator";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/logbook", label: "Logbook", icon: Ship },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <Anchor className="size-8 text-sidebar-primary" />
          <span className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Engine log pro
          </span>
        </div>
      </SidebarHeader>

      <SidebarMenu className="flex-1">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.label}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      <Separator className="my-2" />
      
      <SidebarFooter>
         <div className="flex items-center gap-3 p-2">
            <Avatar className="size-10">
                <AvatarImage src="https://picsum.photos/seed/user/40/40" data-ai-hint="profile picture" alt="User" />
                <AvatarFallback>CE</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm text-sidebar-foreground">Chief Engineer</span>
                <span className="text-xs text-muted-foreground">Online</span>
            </div>
         </div>
      </SidebarFooter>
    </Sidebar>
  );
}
