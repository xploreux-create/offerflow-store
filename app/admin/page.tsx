import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import VendlixaDashboard from "@/components/VendlixaDashboard";

export default async function AdminPage() {
  if (!await isAdmin()) redirect("/admin/login");
  return <VendlixaDashboard />;
}
