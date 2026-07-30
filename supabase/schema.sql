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
  status text not null default 'draft' check (status in ('draft','published')),
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

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-covers', 'product-covers', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-files', 'product-files', false, 209715200, array['application/pdf'])
on conflict (id) do update set public = false;
