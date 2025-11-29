
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/logbook", label: "Input Data", icon: Icons.camera },
  { href: "/log-activity", label: "Log Activity", icon: Icons.history },
  { href: "/", label: "Home", icon: Icons.home, isCentral: true },
  { href: "/inventory", label: "Inventory", icon: Icons.archive },
  { href: "/settings", label: "Settings", icon: Icons.settings },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-20 border-t bg-card">
      <div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.isCentral) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative inline-flex flex-col items-center justify-center px-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <div className="relative flex h-16 w-16 -translate-y-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className={cn(
                    "text-xs absolute bottom-2 text-center font-medium transition-opacity duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative inline-flex flex-col items-center justify-center px-2 text-muted-foreground transition-colors hover:text-foreground",
                isActive && "text-primary"
              )}
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ease-out">
                <item.icon className="h-6 w-6" />
              </div>
              <span className="mt-1 text-center text-xs transition-opacity duration-300">
                {item.label}
              </span>
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
