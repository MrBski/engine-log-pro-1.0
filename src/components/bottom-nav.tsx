"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Ship, Warehouse, Settings, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/logbook", label: "Logbook", icon: Ship },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm border-t md:flex md:items-center md:justify-center md:h-auto md:relative md:border-none md:bg-transparent md:backdrop-blur-none">
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm mx-auto">
        <div className="flex justify-around items-center h-16 bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.1)] rounded-t-2xl px-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-lg transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
