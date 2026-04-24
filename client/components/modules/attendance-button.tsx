"use client";

export default function AttendanceButton() {
  const handleCheckIn = async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
    const token =
      typeof window !== "undefined" ? window.localStorage.getItem("crm_token") : null;

    await fetch(`${apiBaseUrl}/attendance/checkin`, {
      method: "POST",
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });
  };

  return (
    <button onClick={handleCheckIn} className="attendance-button">
      Check In
    </button>
  );
}
