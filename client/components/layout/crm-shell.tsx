"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { useTheme } from "@/components/providers/theme-provider";
import type { CRMUser } from "@/types/crm";

type CRMShellProps = {
  children: React.ReactNode;
  user: CRMUser;
};

const roleLabel: Record<CRMUser["role"], string> = {
  SUPERADMIN: "CEO",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  INTERN: "Intern",
};

export function CRMShell({ children, user }: CRMShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/tasks", label: "Tasks" },
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN" || user.role === "MANAGER"
      ? [{ href: "/projects", label: "Projects" }]
      : []),
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN" || user.role === "MANAGER"
      ? [{ href: "/employees", label: "Team" }]
      : []),
    ...(user.role === "SUPERADMIN" || user.role === "ADMIN"
      ? [{ href: "/departments", label: "Departments" }]
      : []),
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

  return (
    <div className="min-h-screen text-[var(--text-main)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-3 py-3 lg:flex-row lg:px-5">
        <aside
          className="w-full rounded-[22px] border px-5 py-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[278px]"
          style={{
            background: "var(--sidebar)",
            borderColor: "rgba(255,255,255,0.08)",
            color: "#f8fafc",
            boxShadow: "0 18px 40px rgba(2, 6, 23, 0.22)",
          }}
        >
          <div className="flex h-full flex-col">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                Planitt CRM
              </div>
              <div className="mt-5 rounded-[18px] bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Signed in as</p>
                <h1 className="mt-2 text-xl font-semibold">{user.name}</h1>
                <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                <span className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  {roleLabel[user.role]}
                </span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="mt-4 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                >
                  <span>{theme === "light" ? "Light mode" : "Dark mode"}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Switch
                  </span>
                </button>
              </div>
            </div>

            <nav className="mt-6 space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] opacity-60">
                      {isActive ? "Live" : "Go"}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-[18px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-300">
                Cleaner workspace, calmer colors, and focused modules for daily operations.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
