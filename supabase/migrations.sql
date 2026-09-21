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

-- Allow admins to reject an individual payment submission without activating the account.
create or replace function public.admin_reject_payment(target_user_id uuid, payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.payment_submissions
    set status = 'rejected'
    where id = payment_id
      and user_id = target_user_id
      and status = 'pending';

  if not found then
    raise exception 'Pending payment not found';
  end if;

  update public.profiles
    set is_active = false
    where id = target_user_id;

  return true;
end;
$$;

grant execute on function public.admin_reject_payment(uuid, uuid) to authenticated;

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

-- Automatic FimiPay payment tracking.
create table if not exists public.automatic_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id text unique,
  amount numeric(12,2) not null default 16000,
  currency text not null default 'TZS',
  phone text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled','expired')),
  checkout_url text,
  provider_status text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automatic_payments_user_id_idx on public.automatic_payments(user_id);
create index if not exists automatic_payments_status_idx on public.automatic_payments(status);
alter table public.automatic_payments enable row level security;
drop policy if exists "auto_payments_select_own_or_admin" on public.automatic_payments;
create policy "auto_payments_select_own_or_admin" on public.automatic_payments for select to authenticated using (user_id = auth.uid() or public.is_admin());

create or replace function public.activate_user_from_auto_payment(target_user_id uuid, auto_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.automatic_payments set status = 'paid', updated_at = now()
  where id = auto_payment_id and user_id = target_user_id and status in ('pending','processing');
  if not found then return false; end if;
  update public.profiles set is_active = true where id = target_user_id;
  return found;
end;
$$;
revoke all on function public.activate_user_from_auto_payment(uuid, uuid) from public;
grant execute on function public.activate_user_from_auto_payment(uuid, uuid) to service_role;

-- Dashboard/Admin upgrade (keep in sync with 20260921110000_dashboard_admin_features.sql)
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists expenses numeric(12,2) not null default 0;
alter table public.profiles add column if not exists bonus numeric(12,2) not null default 0;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
  title text not null, message text not null, created_at timestamptz not null default now(), dismissed_at timestamptz
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin" on public.notifications for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications for insert to authenticated with check (public.is_admin());

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0), phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);
alter table public.withdrawal_requests enable row level security;
drop policy if exists "withdrawals_select_own_or_admin" on public.withdrawal_requests;
create policy "withdrawals_select_own_or_admin" on public.withdrawal_requests for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "withdrawals_insert_own" on public.withdrawal_requests;
create policy "withdrawals_insert_own" on public.withdrawal_requests for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "withdrawals_update_admin" on public.withdrawal_requests;
create policy "withdrawals_update_admin" on public.withdrawal_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_set_user_status(target_user_id uuid, active boolean, banned boolean)
returns boolean language plpgsql security definer set search_path=public as $$ begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set is_active=active,is_banned=banned where id=target_user_id;
  if not found then raise exception 'User not found'; end if; return true;
end; $$;
grant execute on function public.admin_set_user_status(uuid, boolean, boolean) to authenticated;

create or replace function public.admin_adjust_balance(target_user_id uuid, amount_delta numeric, new_expenses numeric default null, new_bonus numeric default null)
returns numeric language plpgsql security definer set search_path=public as $$ declare new_balance numeric; begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set balance=greatest(0,balance+amount_delta), expenses=case when new_expenses is null then expenses else greatest(0,new_expenses) end, bonus=case when new_bonus is null then bonus else greatest(0,new_bonus) end where id=target_user_id returning balance into new_balance;
  if new_balance is null then raise exception 'User not found'; end if; return new_balance;
end; $$;
grant execute on function public.admin_adjust_balance(uuid, numeric, numeric, numeric) to authenticated;

create or replace function public.admin_review_withdrawal(request_id uuid, next_status text, note text default null)
returns boolean language plpgsql security definer set search_path=public as $$ declare req public.withdrawal_requests%rowtype; begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if next_status not in ('approved','rejected','paid') then raise exception 'Invalid withdrawal status'; end if;
  select * into req from public.withdrawal_requests where id=request_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if req.status='pending' and next_status in ('approved','paid') then
    update public.profiles set balance=balance-req.amount where id=req.user_id and balance>=req.amount;
    if not found then raise exception 'Insufficient user balance'; end if;
  end if;
  update public.withdrawal_requests set status=next_status,admin_note=note,updated_at=now() where id=request_id; return true;
end; $$;
grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;

-- Users do not directly update profile rows; admin-only RPCs manage balances/status.
drop policy if exists "profiles_update_own" on public.profiles;

create or replace function public.complete_chat(earn_amount numeric)
returns numeric language plpgsql security definer set search_path=public as $$ declare new_balance numeric; begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles set balance=balance+earn_amount where id=auth.uid() and is_active=true and is_banned=false returning balance into new_balance;
  if new_balance is null then raise exception 'Account is not active'; end if; return new_balance;
end; $$;
grant execute on function public.complete_chat(numeric) to authenticated;

create or replace function public.activate_user_from_auto_payment(target_user_id uuid, auto_payment_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ declare activated boolean:=false; begin
  update public.automatic_payments set status='paid',updated_at=now() where id=auto_payment_id and user_id=target_user_id and status in ('pending','processing');
  if not found then return false; end if;
  update public.profiles set is_active=true where id=target_user_id and is_banned=false;
  if found then activated:=true; end if; return activated;
end; $$;
revoke all on function public.activate_user_from_auto_payment(uuid, uuid) from public;
grant execute on function public.activate_user_from_auto_payment(uuid, uuid) to service_role;
