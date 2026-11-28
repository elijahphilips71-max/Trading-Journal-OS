"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { OfflineSync } from "./OfflineSync";
import {
  HomeIcon,
  LinkIcon,
  PlaybookIcon,
  PlusIcon,
  SettingsIcon,
  SparkIcon,
  StatsIcon,
  TradesIcon,
} from "./icons";
import { NAV, isActive, type NavItem } from "./nav";

const ICONS: Record<NavItem["icon"], (p: { size?: number }) => ReactNode> = {
  home: HomeIcon,
  trades: TradesIcon,
  playbook: PlaybookIcon,
  stats: StatsIcon,
  coach: SparkIcon,
  dad: LinkIcon,
  settings: SettingsIcon,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tabs = NAV.slice(0, 4);

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Main">
        <Link href="/" className="flex items-center gap-3 px-2 pb-5 text-[var(--text)]">
          <Logo size={36} />
          <span className="text-[17px] font-extrabold tracking-tight">OS Journal</span>
        </Link>
        <Link href="/log" className="btn pri mb-3">
          <PlusIcon size={20} />
          Log a trade
        </Link>
        {NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const on = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`side-link ${on ? "on" : ""}`}
              aria-current={on ? "page" : undefined}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </aside>

      <div className="main">
        <OfflineSync />
        {children}
      </div>

      <nav className="tabbar" aria-label="Main">
        {tabs.slice(0, 2).map((t) => (
          <Tab key={t.href} item={t} on={isActive(pathname, t.href)} />
        ))}
        <Link href="/log" className="fab" aria-label="Log a trade">
          <PlusIcon size={26} />
        </Link>
        {tabs.slice(2).map((t) => (
          <Tab key={t.href} item={t} on={isActive(pathname, t.href)} />
        ))}
      </nav>
    </div>
  );
}

function Tab({ item, on }: { item: NavItem; on: boolean }) {
  const Icon = ICONS[item.icon];
  return (
    <Link href={item.href} className={`tab ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
      <Icon />
      {item.label}
    </Link>
  );
}
