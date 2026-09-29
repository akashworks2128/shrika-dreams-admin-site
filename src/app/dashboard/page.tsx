import { Building2, MapPin, Contact, Users } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import {
  getKpiCounts,
  getProjectOverview,
  getRecentLeads,
  getWebsiteOverview,
} from "@/lib/dashboard-data";
import DashboardHeader from "./components/DashboardHeader";
import WelcomeCard from "./components/WelcomeCard";
import StatCard from "./components/StatCard";
import RecentLeads from "./components/RecentLeads";
import QuickActions from "./components/QuickActions";
import ProjectOverview from "./components/ProjectOverview";
import WebsiteOverview from "./components/WebsiteOverview";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [kpis, recentLeads, projectOverview, websiteOverview] = await Promise.all([
    getKpiCounts(supabase),
    getRecentLeads(supabase, 5),
    getProjectOverview(supabase),
    getWebsiteOverview(supabase),
  ]);

  return (
    <>
      <DashboardHeader
        title="Dashboard"
        subtitle="Manage your website content and enquiries from one place."
        adminName={ADMIN_DISPLAY_NAME}
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="space-y-5">
          <WelcomeCard adminName={ADMIN_DISPLAY_NAME} />

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label="Projects"
              value={kpis.projects}
              supportingText="Total listed projects"
            />
            <StatCard
              icon={MapPin}
              label="Localities"
              value={kpis.localities}
              supportingText="Active premium zones"
            />
            <StatCard
              icon={Contact}
              label="Builders"
              value={kpis.builders}
              supportingText="Trusted developers listed"
            />
            <StatCard
              icon={Users}
              label="Leads"
              value={kpis.leads}
              supportingText="Total enquiries received"
            />
          </div>

          {/* Recent Leads + Quick Actions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
            <RecentLeads leads={recentLeads} />
            <QuickActions />
          </div>

          {/* Project Overview + Website Overview */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            <ProjectOverview counts={projectOverview} />
            <WebsiteOverview counts={websiteOverview} />
          </div>
        </div>
      </main>
    </>
  );
}
