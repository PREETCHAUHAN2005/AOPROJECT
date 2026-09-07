import { getDashboardView } from "@/dashboard";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const view = getDashboardView();
  return <DashboardView initial={view} />;
}
