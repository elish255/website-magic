-- Add admin rejection support for payment submissions.
-- Run this migration in Supabase SQL Editor if migrations are not deployed automatically.
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

  -- A rejected payment must never leave the account active.
  update public.profiles
    set is_active = false
    where id = target_user_id;

  return true;
end;
$$;

grant execute on function public.admin_reject_payment(uuid, uuid) to authenticated;
