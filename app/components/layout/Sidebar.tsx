"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/app/components/ui/Icon";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar border-r border-outline-variant" style={{ borderRight: "1px solid rgba(196, 199, 199, 0.2)" }}>
      <nav className="flex flex-col gap-8 px-4" style={{ padding: "0 16px" }}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? "active" : ""}`}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
