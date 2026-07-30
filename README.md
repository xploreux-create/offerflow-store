# OfferFlow Store

A production digital-product store for Vercel, Supabase and Stripe.

## What works

- Public product catalogue with search and category filtering
- Basket and Stripe Checkout
- Password-protected seller area
- PDF uploads up to 200 MB directly to Supabase (avoids Vercel 413 errors)
- Cover-image uploads and storefront thumbnails
- Draft, publish and unpublish controls
- Private paid-download links that expire after one hour
- Stripe webhook order records
- Responsive mobile and desktop interface
- Original OfferFlow purple, lime and coral dashboard design
- Protected seller dashboard at `/` and `/admin`
- Public customer storefront at `/store`

## 1. Set up Supabase

Open your Supabase project, choose **SQL Editor**, paste everything from
`supabase/schema.sql`, and select **Run**.

In **Project Settings → API**, copy:

- Project URL
- anon public key
- service_role key (keep this secret)

## 2. Deploy through GitHub and Vercel

Upload all extracted files to the root of your empty GitHub repository.
In Vercel, choose **Add New → Project**, import `offerflow-store`, and deploy.

Add these Environment Variables in Vercel:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your final Vercel URL, such as `https://offerflow-store.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `ADMIN_PASSWORD` | A strong password you create for `/admin` |

Never put secret keys into GitHub files.

## 3. Configure Stripe

In Stripe, open **Developers → Webhooks → Add endpoint** and use:

`https://YOUR-DOMAIN/api/stripe/webhook`

Subscribe to `checkout.session.completed`. Copy its signing secret into Vercel
as `STRIPE_WEBHOOK_SECRET`, then redeploy.

Enable customer email receipts in Stripe if you want Stripe to email receipts.

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
