import Stripe from "stripe";

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
