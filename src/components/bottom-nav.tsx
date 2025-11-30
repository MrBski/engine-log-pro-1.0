
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
    <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 border-t bg-card md:h-20">
      <div className="mx-auto grid h-full max-w-lg grid-cols-5 font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.isCentral) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative inline-flex flex-col items-center justify-center px-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <div className="relative -translate-y-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-110 md:-translate-y-6 md:h-16 md:w-16">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className={cn(
                    "text-[10px] absolute bottom-1 text-center font-medium transition-opacity duration-300 md:text-xs",
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
                "group relative inline-flex flex-col items-center justify-center px-1 text-muted-foreground transition-colors hover:text-foreground",
                isActive && "text-primary"
              )}
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ease-out">
                <item.icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              <span className="text-[10px] leading-tight text-center md:text-xs">
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
