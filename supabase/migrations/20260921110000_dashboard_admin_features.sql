-- BetaShine dashboard/admin/notifications/withdrawals upgrade
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists expenses numeric(12,2) not null default 0,
  add column if not exists bonus numeric(12,2) not null default 0;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin" on public.notifications for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications for insert to authenticated
with check (public.is_admin());

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  phone text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);
create index if not exists withdrawal_requests_status_idx on public.withdrawal_requests(status);
alter table public.withdrawal_requests enable row level security;
drop policy if exists "withdrawals_select_own_or_admin" on public.withdrawal_requests;
create policy "withdrawals_select_own_or_admin" on public.withdrawal_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "withdrawals_insert_own" on public.withdrawal_requests;
create policy "withdrawals_insert_own" on public.withdrawal_requests for insert to authenticated
with check (user_id = auth.uid());
drop policy if exists "withdrawals_update_admin" on public.withdrawal_requests;
create policy "withdrawals_update_admin" on public.withdrawal_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Admin-only RPCs keep balance/account changes server-side and auditable from the UI.
create or replace function public.admin_set_user_status(target_user_id uuid, active boolean, banned boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set is_active = active, is_banned = banned where id = target_user_id;
  if not found then raise exception 'User not found'; end if;
  return true;
end; $$;
grant execute on function public.admin_set_user_status(uuid, boolean, boolean) to authenticated;

create or replace function public.admin_adjust_balance(target_user_id uuid, amount_delta numeric, new_expenses numeric default null, new_bonus numeric default null)
returns numeric language plpgsql security definer set search_path=public as $$
declare new_balance numeric;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles
    set balance = greatest(0, balance + amount_delta),
        expenses = case when new_expenses is null then expenses else greatest(0,new_expenses) end,
        bonus = case when new_bonus is null then bonus else greatest(0,new_bonus) end
    where id = target_user_id
    returning balance into new_balance;
  if new_balance is null then raise exception 'User not found'; end if;
  return new_balance;
end; $$;
grant execute on function public.admin_adjust_balance(uuid, numeric, numeric, numeric) to authenticated;

create or replace function public.admin_review_withdrawal(request_id uuid, next_status text, note text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare req public.withdrawal_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if next_status not in ('approved','rejected','paid') then raise exception 'Invalid withdrawal status'; end if;
  select * into req from public.withdrawal_requests where id=request_id for update;
  if not found then raise exception 'Withdrawal not found'; end if;
  if req.status = 'pending' and next_status in ('approved','paid') then
    update public.profiles set balance = balance - req.amount where id=req.user_id and balance >= req.amount;
    if not found then raise exception 'Insufficient user balance'; end if;
  end if;
  update public.withdrawal_requests set status=next_status, admin_note=note, updated_at=now() where id=request_id;
  return true;
end; $$;
grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;

-- Prevent banned users from earning through chat.
create or replace function public.complete_chat(earn_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare new_balance numeric;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles
    set balance = balance + earn_amount
    where id = auth.uid() and is_active = true and is_banned = false
    returning balance into new_balance;
  if new_balance is null then raise exception 'Account is not active'; end if;
  return new_balance;
end; $$;
grant execute on function public.complete_chat(numeric) to authenticated;

-- Existing automatic payment activation also respects bans.
create or replace function public.activate_user_from_auto_payment(target_user_id uuid, auto_payment_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare activated boolean := false;
begin
  update public.automatic_payments set status='paid', updated_at=now()
    where id=auto_payment_id and user_id=target_user_id and status in ('pending','processing');
  if not found then return false; end if;
  update public.profiles set is_active=true where id=target_user_id and is_banned=false;
  if found then activated := true; end if;
  return activated;
end; $$;
revoke all on function public.activate_user_from_auto_payment(uuid, uuid) from public;
grant execute on function public.activate_user_from_auto_payment(uuid, uuid) to service_role;

-- Prevent users from editing balance/status/financial fields directly.
drop policy if exists "profiles_update_own" on public.profiles;
