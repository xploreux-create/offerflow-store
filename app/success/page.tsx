import SuccessDownloads from "@/components/SuccessDownloads";

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  return <main className="shell"><section className="success"><span className="pill">PAYMENT SUCCESSFUL</span><h1>Thank you for your order</h1>{session_id ? <SuccessDownloads sessionId={session_id} /> : <div className="notice">The order reference is missing.</div>}<p><a href="/">← Return to the shop</a></p></section></main>;
}
