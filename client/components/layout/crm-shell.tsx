"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
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

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/tasks", label: "Tasks" },
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(76,122,255,0.16),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <aside className="w-full rounded-[28px] border border-white/60 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[320px]">
          <div className="flex h-full flex-col">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                Planitt CRM
              </div>
              <div className="mt-6 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-sm text-slate-400">Signed in as</p>
                <h1 className="mt-1 text-2xl font-semibold">{user.name}</h1>
                <p className="mt-1 text-sm text-slate-300">{user.email}</p>
                <span className="mt-4 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200">
                  {roleLabel[user.role]}
                </span>
              </div>
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-lg"
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

            <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-300">
                Keep this workspace simple for your team. Admins manage people, and employees stay focused on daily work.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
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
