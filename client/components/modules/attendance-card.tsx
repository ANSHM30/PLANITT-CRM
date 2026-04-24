"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

type AttendanceCardProps = {
  initialCheckedIn?: boolean;
};

export function AttendanceCard({ initialCheckedIn = false }: AttendanceCardProps) {
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    initialCheckedIn ? "You are currently checked in." : "Start the day when you're ready."
  );

  const handleAttendance = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (checkedIn) {
        await apiPost("/attendance/checkout");
        setCheckedIn(false);
        setMessage("Checked out successfully.");
        return;
      }

      await apiPost("/attendance/checkin");
      setCheckedIn(true);
      setMessage("Checked in successfully.");
    } catch (error) {
      const err = error as Error & { status?: number };

      if (err.status === 409) {
        setCheckedIn(true);
        setMessage("You are already checked in. Use the button again when you leave.");
        return;
      }

      if (err.status === 404) {
        setCheckedIn(false);
        setMessage("No open check-in was found.");
        return;
      }

      setMessage(err.message || "Attendance action failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Attendance</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">
            {checkedIn ? "You're active for today" : "Ready to start work?"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        </div>

        <button
          type="button"
          onClick={handleAttendance}
          disabled={loading}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Please wait..." : checkedIn ? "Check out" : "Check in"}
        </button>
      </div>
    </div>
  );
}
