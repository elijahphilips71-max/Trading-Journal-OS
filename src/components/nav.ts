export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "trades" | "playbook" | "stats" | "coach" | "dad" | "settings";
};

/** Sidebar on laptop. The phone tab bar uses the first four plus the big + button. */
export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/trades", label: "Trades", icon: "trades" },
  { href: "/playbook", label: "Playbook", icon: "playbook" },
  { href: "/stats", label: "Stats", icon: "stats" },
  { href: "/coach", label: "AI coach", icon: "coach" },
  { href: "/dad", label: "Dad's view", icon: "dad" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
