import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import OfferFlowDashboard from "@/components/OfferFlowDashboard";

export default async function Home() {
  if (!await isAdmin()) redirect("/admin/login");
  return <OfferFlowDashboard />;
}
