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
    <div
      className="rounded-[20px] border p-5"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text-soft)]">Attendance</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--text-main)]">
            {checkedIn ? "You're active for today" : "Ready to start work?"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{message}</p>
        </div>

        <button
          type="button"
          onClick={handleAttendance}
          disabled={loading}
          className="rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-70"
          style={{ background: "var(--accent-strong)" }}
        >
          {loading ? "Please wait..." : checkedIn ? "Check out" : "Check in"}
        </button>
      </div>
    </div>
  );
}
