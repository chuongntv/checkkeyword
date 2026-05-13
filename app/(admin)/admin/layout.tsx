"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const adminTabs = [
  { title: "Dashboard", href: "/admin" },
  { title: "Users", href: "/admin/users" },
  { title: "Workspaces", href: "/admin/workspaces" },
  { title: "Proxies", href: "/admin/proxies" },
  { title: "Crawler Config", href: "/admin/crawler-config" },
]

export default function AdminNavLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <nav className="flex gap-1 mb-6 border-b pb-2">
        {adminTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              pathname === tab.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.title}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
