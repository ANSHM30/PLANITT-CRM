import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OverviewCards } from "@/components/modules/overview-cards";

export default function HomePage() {
  return (
    <DashboardShell>
      <section className="hero">
        <p className="eyebrow">Planitt CRM</p>
        <h1>Track leads, manage follow-ups, and grow customer relationships.</h1>
        <p className="subtext">
          This starter dashboard gives us a base to build leads, deals, contacts,
          tasks, and reporting in a clean way.
        </p>
      </section>
      <OverviewCards />
    </DashboardShell>
  );
}
