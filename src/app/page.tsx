import { cookies, headers } from "next/headers";
import { getDashboardView } from "@/dashboard";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { runWithStore } from "@/store/session-context";
import { DashboardView } from "./dashboard-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  const hdrs = await headers();
  const sessionId = jar.get(SESSION_COOKIE)?.value ?? hdrs.get("x-evolyn-sid") ?? "local";
  const view = runWithStore(sessionId, () => getDashboardView());
  return <DashboardView initial={view} />;
}
