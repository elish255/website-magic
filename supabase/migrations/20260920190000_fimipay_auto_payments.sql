-- Automatic FimiPay payment tracking.
create table if not exists public.automatic_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id text unique,
  amount numeric(12,2) not null default 14500,
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
create policy "auto_payments_select_own_or_admin"
on public.automatic_payments for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Used by the trusted FimiPay edge function after the provider confirms payment.
create or replace function public.activate_user_from_auto_payment(target_user_id uuid, auto_payment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.automatic_payments
    set status = 'paid', updated_at = now()
    where id = auto_payment_id
      and user_id = target_user_id
      and status in ('pending','processing');

  if not found then
    return false;
  end if;

  update public.profiles
    set is_active = true
    where id = target_user_id;

  return found;
end;
$$;

revoke all on function public.activate_user_from_auto_payment(uuid, uuid) from public;
grant execute on function public.activate_user_from_auto_payment(uuid, uuid) to service_role;
