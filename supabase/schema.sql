create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null default '',
  category text not null,
  price_pence integer not null check (price_pence >= 50),
  cover_path text,
  pdf_path text not null,
  pdf_name text not null,
  pdf_size bigint not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email text,
  amount_total integer not null default 0,
  currency text not null default 'gbp',
  payment_status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  title text not null,
  price_pence integer not null
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  name text not null check (char_length(name) between 1 and 120),
  objective text not null default 'OUTCOME_SALES',
  country text not null default 'GB' check (country ~ '^[A-Z]{2}$'),
  age_min integer not null default 18 check (age_min between 18 and 65),
  age_max integer not null default 65 check (age_max between 18 and 65 and age_max >= age_min),
  daily_budget_pence integer not null check (daily_budget_pence between 100 and 1000000),
  duration_days integer not null check (duration_days between 1 and 90),
  primary_text text not null check (char_length(primary_text) between 1 and 500),
  headline text not null check (char_length(headline) between 1 and 100),
  interest_ids text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','ready','paused','active','completed')),
  meta_campaign_id text,
  meta_adset_id text,
  meta_creative_id text,
  meta_ad_id text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.campaigns enable row level security;

create index if not exists campaigns_status_created_at_idx on public.campaigns (status, created_at desc);
create index if not exists campaigns_product_id_idx on public.campaigns (product_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-covers', 'product-covers', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-files', 'product-files', false, 209715200, array['application/pdf'])
on conflict (id) do update set public = false;
