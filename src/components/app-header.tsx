"use client";

import React from 'react';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SyncStatus } from "@/components/sync-status";
import { usePathname } from "next/navigation";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";

const getBreadcrumb = (pathname: string) => {
    const parts = pathname.split('/').filter(p => p);
    const breadcrumbs = parts.map((part, index) => {
        const href = '/' + parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;
        const name = part.charAt(0).toUpperCase() + part.slice(1);
        return (
            <React.Fragment key={href}>
                 <BreadcrumbSeparator />
                <BreadcrumbItem>
                    {isLast ? (
                        <BreadcrumbPage>{name}</BreadcrumbPage>
                    ) : (
                        <BreadcrumbLink asChild>
                           <Link href={href}>{name}</Link>
                        </BreadcrumbLink>
                    )}
                </BreadcrumbItem>
            </React.Fragment>
        );
    });

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/">Dashboard</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbs}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        {getBreadcrumb(pathname)}
      </div>
      <div className="flex items-center gap-4">
        <SyncStatus />
      </div>
    </header>
  );
}
