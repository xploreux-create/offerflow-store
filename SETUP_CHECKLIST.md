# OfferFlow Launch Checklist

Complete these steps in order.

## A. Upload the code to GitHub

1. Download and extract `offerflow-store.zip`.
2. Open `https://github.com/xploreux-create/offerflow-store`.
3. Select **Add file**, then **Upload files**.
4. Drag all the files and folders from inside the extracted `offerflow-store`
   folder into GitHub. Do not upload the ZIP itself.
5. Select **Commit changes**.

## B. Prepare Supabase

1. Open your Supabase project.
2. Select **SQL Editor**.
3. Select **New query**.
4. Open `supabase/schema.sql` from the extracted folder.
5. Copy all its contents into the Supabase query box.
6. Select **Run**.
7. Open **Project Settings → API** and keep this page open.

## C. Deploy with Vercel

1. Sign in to Vercel.
2. Select **Add New → Project**.
3. Import `xploreux-create/offerflow-store`.
4. Keep the detected framework as **Next.js**.
5. Add the environment variables listed in `.env.example`.
6. Select **Deploy**.
7. Copy the live Vercel address.
8. Change `NEXT_PUBLIC_SITE_URL` to that exact address and redeploy.

## D. Connect Stripe

1. Use Stripe **test mode** first.
2. Add the Stripe test secret key to Vercel as `STRIPE_SECRET_KEY`.
3. In Stripe, open **Developers → Webhooks**.
4. Add `https://YOUR-VERCEL-ADDRESS/api/stripe/webhook`.
5. Select the event `checkout.session.completed`.
6. Add its signing secret to Vercel as `STRIPE_WEBHOOK_SECRET`.
7. Redeploy from Vercel.

## E. Test the complete workflow

1. Visit `https://YOUR-VERCEL-ADDRESS/admin`.
2. Sign in with the password you set in `ADMIN_PASSWORD`.
3. Upload one PDF and one cover.
4. Choose **Publish to store**.
5. Confirm that its cover appears on the shop.
6. Add it to the basket.
7. Complete a Stripe test payment using card number `4242 4242 4242 4242`,
   any future expiry date and any three-digit CVC.
8. Confirm that the paid-download button appears.

Do not switch Stripe to live mode until every step above passes.
