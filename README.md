# Vendlixa Store

A production digital-product store for Vercel, Supabase and Stripe.

## What works

- Public product catalogue with search and category filtering
- Basket and Stripe Checkout
- Password-protected seller area
- PDF uploads up to 200 MB directly to Supabase (avoids Vercel 413 errors)
- Cover-image uploads and storefront thumbnails
- Draft, publish and unpublish controls
- Safe archive controls that preserve sold-order records
- Private paid-download links that expire after one hour
- Stripe webhook order records
- Live dashboard figures calculated from real orders
- Real order history with purchased items
- Secure sign-out and production security headers
- Responsive mobile and desktop interface
- Original Vendlixa purple, lime and coral dashboard design
- Protected seller dashboard at `/` and `/admin`
- Public customer storefront at `/store`
- Campaign drafts with product, country, age, budget, duration and ad-copy controls
- Safe Meta Marketing API launch in paused status for review before spending

## 1. Set up Supabase

Open your Supabase project, choose **SQL Editor**, paste everything from
`supabase/schema.sql`, and select **Run**.

If you already ran an earlier store schema, run
`supabase/production-upgrade.sql` instead. It adds the production archive
status and database indexes without deleting existing products or orders.
The latest upgrade also creates the `campaigns` table.

In **Project Settings → API**, copy:

- Project URL
- Publishable key
- Secret key (keep this secret)

## 2. Deploy through GitHub and Vercel

Upload all extracted files to the root of your empty GitHub repository.
In Vercel, choose **Add New → Project**, import `offerflow-store`, and deploy.

Add these Environment Variables in Vercel:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your final Vercel URL, such as `https://offerflow-store.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `ADMIN_PASSWORD` | A strong password you create for `/admin` |
| `META_ACCESS_TOKEN` | Meta system-user token with ads-management access |
| `META_AD_ACCOUNT_ID` | Meta ad account number (with or without `act_`) |
| `META_PIXEL_ID` | Pixel used to optimize for purchases |
| `META_PAGE_ID` | Facebook Page identity for the ad |

Never put secret keys into GitHub files.

The Meta variables are only required when you select **Send to Meta**. Campaign
planning and saving works without them. Vendlixa always creates Meta campaigns,
ad sets and ads as **paused**; review the tracking, audience and creative in Meta
Ads Manager before activating.

## 3. Configure Stripe

In Stripe, open **Developers → Webhooks → Add endpoint** and use:

`https://YOUR-DOMAIN/api/stripe/webhook`

Subscribe to `checkout.session.completed`. Copy its signing secret into Vercel
as `STRIPE_WEBHOOK_SECRET`, then redeploy.

Enable customer email receipts in Stripe if you want Stripe to email receipts.

## Production routes

- `/admin` — password-protected seller dashboard
- `/store` — public customer storefront
- `/success` — verified paid-download delivery

## 4. Add the first product

Visit `https://YOUR-DOMAIN/admin`, enter your `ADMIN_PASSWORD`, upload the PDF
and cover image, choose **Publish to store**, and select **Upload product**.
The product will appear at `https://YOUR-DOMAIN/store` immediately.

## Local development

Copy `.env.example` to `.env.local`, enter your test values, then:

```bash
npm install
npm run dev
```
