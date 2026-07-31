-- Run this once in Supabase SQL Editor if you already ran the original schema.
alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('draft', 'published', 'archived'));

create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

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

alter table public.campaigns enable row level security;
create index if not exists campaigns_status_created_at_idx
  on public.campaigns (status, created_at desc);
create index if not exists campaigns_product_id_idx
  on public.campaigns (product_id);

-- AI campaign generation and guarded automatic optimisation.
alter table public.campaigns add column if not exists ai_generated boolean not null default false;
alter table public.campaigns add column if not exists ai_analysis jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists ad_variations jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists targeting_recommendations jsonb not null default '{}'::jsonb;
alter table public.campaigns add column if not exists auto_optimize boolean not null default true;
alter table public.campaigns add column if not exists target_cpa_pence integer;
alter table public.campaigns add column if not exists max_daily_budget_pence integer;
alter table public.campaigns add column if not exists meta_ad_ids text[] not null default '{}';
alter table public.campaigns add column if not exists optimization_log jsonb not null default '[]'::jsonb;
alter table public.campaigns add column if not exists last_optimized_at timestamptz;
alter table public.campaigns add column if not exists target_countries text[] not null default array['GB']::text[];
update public.campaigns set target_countries = array[country] where target_countries = array['GB']::text[] and country <> 'GB';
