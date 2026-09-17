-- Run this SQL in Supabase SQL Editor once.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null,
  username text not null unique,
  phone text not null,
  county text not null,
  is_active boolean not null default false,
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;

create table if not exists public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paid_phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists payment_submissions_user_id_idx on public.payment_submissions(user_id);
create index if not exists payment_submissions_status_idx on public.payment_submissions(status);


-- Automatically create a profile when a new Supabase Auth user registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, username, phone, county)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'User'),
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'county', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    username = excluded.username,
    phone = excluded.phone,
    county = excluded.county;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

 drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "payments_insert_own" on public.payment_submissions;
create policy "payments_insert_own" on public.payment_submissions for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "payments_select_own_or_admin" on public.payment_submissions;
create policy "payments_select_own_or_admin" on public.payment_submissions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments_update_admin" on public.payment_submissions;
create policy "payments_update_admin" on public.payment_submissions for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_activate_user(target_user_id uuid, payment_id uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.profiles set is_active = true where id = target_user_id;
  if not found then raise exception 'User not found'; end if;

  if payment_id is not null then
    update public.payment_submissions
      set status = 'approved'
      where id = payment_id and user_id = target_user_id;
  else
    update public.payment_submissions
      set status = 'approved'
      where user_id = target_user_id and status = 'pending';
  end if;

  return true;
end;
$$;

grant execute on function public.admin_activate_user(uuid, uuid) to authenticated;

create or replace function public.complete_chat(earn_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare new_balance numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles
    set balance = balance + earn_amount
    where id = auth.uid() and is_active = true
    returning balance into new_balance;
  if new_balance is null then raise exception 'Account is not active'; end if;
  return new_balance;
end;
$$;

grant execute on function public.complete_chat(numeric) to authenticated;
