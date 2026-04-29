"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useTheme } from "@/components/providers/theme-provider";
import { useNotifications } from "@/hooks/use-notifications";
import type { CRMUser } from "@/types/crm";

type CRMShellProps = {
  children: React.ReactNode;
  user: CRMUser;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const roleLabel: Record<CRMUser["role"], string> = {
  SUPERADMIN: "CEO",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  INTERN: "Intern",
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/tasks": "Tasks",
  "/employees": "Employees",
  "/departments": "Departments",
  "/chat": "Chats",
  "/settings": "Settings",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CRMShell({ children, user }: CRMShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { items, unreadCount, markAllRead, markRead, clearAll } = useNotifications(user);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: "D" },
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN" || user.role === "MANAGER"
      ? [{ href: "/projects", label: "Projects", icon: "P" }]
      : []),
    { href: "/tasks", label: "Tasks", icon: "T" },
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN" || user.role === "MANAGER"
      ? [{ href: "/employees", label: "Employees", icon: "E" }]
      : []),
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN"
      ? [{ href: "/departments", label: "Departments", icon: "O" }]
      : []),
    { href: "/chat", label: "Chats", icon: "C" },
    { href: "/settings", label: "Settings", icon: "S" },
  ];

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  useEffect(() => {
    const storageKey = `crm-theme:${user.id}`;
    const savedTheme = window.localStorage.getItem(storageKey) as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [setTheme, user.id]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    window.localStorage.setItem(`crm-theme:${user.id}`, nextTheme);
    setTheme(nextTheme);
  };

  const darkWorkspace = ["/tasks", "/projects"].some((route) => pathname.startsWith(route));
  const pageTitle = pageTitles[pathname] ?? "CRM";

  return (
    <div
      className={`min-h-screen text-[var(--text-main)] ${darkWorkspace ? "crm-shell-dark" : ""}`}
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--app-bg) 92%, white), var(--app-bg-accent))",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-3 px-3 py-3 lg:flex-row">
        <aside
          className="w-full overflow-hidden rounded-lg border px-3 py-3 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:w-[214px] lg:shrink-0"
          style={{
            background: darkWorkspace
              ? "linear-gradient(180deg, #071120 0%, #0b1626 100%)"
              : "linear-gradient(180deg, #356bff 0%, #063ce9 100%)",
            borderColor: "rgba(255,255,255,0.14)",
            color: "#f8fafc",
            boxShadow: darkWorkspace
              ? "0 18px 44px rgba(0,0,0,0.34)"
              : "0 18px 44px rgba(31,85,255,0.25)",
          }}
        >
          <div className="flex h-full flex-col">
            <div>
              <div className="flex items-center gap-2 px-1 py-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-black text-blue-600">
                  P
                </div>
                <div>
                  <p className="text-sm font-bold leading-none text-white">Planitt CRM</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55">
                    CRM Pro
                  </p>
                </div>
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-semibold transition ${
                      isActive
                        ? darkWorkspace
                          ? "bg-blue-500/22 text-white shadow-sm"
                          : "bg-white text-blue-700 shadow-sm"
                        : "text-white/78 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-black ${
                        isActive ? "bg-blue-600 text-white" : "bg-white/10 text-white/80"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-lg border border-white/12 bg-white/8 p-3">
              <div className="flex items-center gap-3">
                <div className="crm-avatar flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold">
                  {initials(user.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-white/60">{roleLabel[user.role]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="mt-3 flex w-full items-center justify-between rounded-md border border-white/10 bg-white/7 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/12"
              >
                <span>{theme === "light" ? "Light" : "Dark"} mode</span>
                <span>Switch</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 w-full rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header
            className="mb-3 flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
                CRM Pro
              </p>
              <h1 className="mt-1 text-xl font-bold text-[var(--text-main)]">{pageTitle}</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-faint)]">
                  Search
                </span>
                <input
                  aria-label="Search CRM"
                  className="crm-input h-10 w-full rounded-md pl-16 pr-3 text-sm sm:w-72"
                  placeholder="Search anything..."
                />
              </label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className="relative flex h-10 w-10 items-center justify-center rounded-md border text-sm font-bold"
                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text-soft)" }}
                    aria-label="Notifications"
                    onClick={() => {
                      setNotificationsOpen((value) => !value);
                      markAllRead();
                    }}
                  >
                    !
                    {unreadCount > 0 ? (
                      <span
                        className="absolute -right-1 -top-1 min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: "var(--danger)" }}
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div
                      className="absolute right-0 z-50 mt-2 w-[360px] rounded-lg border p-3"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        boxShadow: "var(--shadow-card)",
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-main)]">Notifications</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs font-semibold"
                            style={{ color: "var(--accent-strong)" }}
                          >
                            Mark read
                          </button>
                          <button
                            type="button"
                            onClick={clearAll}
                            className="text-xs font-semibold"
                            style={{ color: "var(--danger)" }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {items.length === 0 ? (
                          <p className="rounded-md border px-3 py-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-soft)" }}>
                            No notifications yet.
                          </p>
                        ) : (
                          items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full rounded-md border p-3 text-left"
                              style={{
                                borderColor: "var(--border)",
                                background: item.read ? "var(--surface)" : "var(--surface-soft)",
                              }}
                              onClick={() => {
                                markRead(item.id);
                                setNotificationsOpen(false);
                                router.push(item.href);
                              }}
                            >
                              <p className="text-sm font-semibold text-[var(--text-main)]">{item.title}</p>
                              <p className="mt-1 text-xs text-[var(--text-soft)]">{item.message}</p>
                              <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="crm-avatar flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold">
                  {initials(user.name)}
                </div>
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
