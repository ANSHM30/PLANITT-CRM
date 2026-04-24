"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(76,122,255,0.24),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#e0e7ff_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[36px] border border-white/60 bg-slate-950 p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.35)] lg:p-12">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
            Modern CRM Workspace
          </div>
          <h1 className="mt-8 max-w-2xl text-4xl font-semibold leading-tight lg:text-6xl">
            Run sales, people, and daily operations from one simple dashboard.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            Admins can manage employees, interns, and task allocation. Team members get a clean daily workspace focused on execution.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Role-based access", value: "Admin / Employee / Intern" },
              { label: "Task tracking", value: "Create, assign, update" },
              { label: "Daily workflow", value: "Attendance + execution" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-3 text-sm font-medium text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[36px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.14)] backdrop-blur lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Planitt CRM
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Login</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Use the seeded admin or employee account to explore the CRM experience.
          </p>

          <div className="mt-8 space-y-4">
            <input
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            onClick={handleLogin}
            className="mt-6 h-14 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Enter workspace"}
          </button>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <p className="font-semibold text-slate-700">Quick demo accounts</p>
            <p className="mt-2">Admin: admin@planittcrm.com</p>
            <p>Password: Planitt@123</p>
          </div>
        </section>
      </div>
    </div>
  );
}
