"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";
import { resolveApiBaseUrl } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const GOOGLE_FRIENDLY_ERROR = "Unable to continue with Google login right now. Please try again in a moment.";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const queryState = query.get("google");
    const state = queryState;

    if (state === "connected") {
      setToken("cookie-session");
      window.history.replaceState({}, document.title, "/login");
      router.push("/dashboard");
      return;
    }

    if (state === "user_not_found") {
      setError("Google account is not registered in CRM yet. Ask admin to create your user first.");
    } else if (state === "denied") {
      setError("Google login was cancelled.");
    } else if (
      state === "missing_config" ||
      state === "token_failed" ||
      state === "failed" ||
      state === "missing_code" ||
      state === "email_missing"
    ) {
      setError(GOOGLE_FRIENDLY_ERROR);
    }
  }, [router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${resolveApiBaseUrl()}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setToken("cookie-session");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      const res = await fetch(`${resolveApiBaseUrl()}/auth/google/auth-url`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.authUrl) {
        throw new Error("google_auth_start_failed");
      }

      window.location.href = data.authUrl;
    } catch (_err) {
      setError(GOOGLE_FRIENDLY_ERROR);
      setGoogleLoading(false);
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
              suppressHydrationWarning
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              suppressHydrationWarning
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-950"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}

          <button
            suppressHydrationWarning
            onClick={handleLogin}
            className="mt-6 h-14 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Enter workspace"}
          </button>

          <button
            suppressHydrationWarning
            type="button"
            onClick={handleGoogleLogin}
            className="mt-3 h-14 w-full rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            disabled={googleLoading}
          >
            {googleLoading ? "Redirecting to Google..." : "Login with Google"}
          </button>
        </section>
      </div>
    </div>
  );
}
