# BetaShine payment + admin setup

## 1. Supabase SQL
Open Supabase SQL Editor and run the contents of `supabase/migrations.sql`.

## 2. Create admin account
Create an email/password user in Supabase Authentication. Then run:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL';
```

Replace `YOUR_ADMIN_EMAIL` with the exact admin email.

## 3. Email confirmation
Because registration must continue immediately to the payment page, turn off mandatory email confirmation in Supabase Authentication if your project currently requires confirmation. Otherwise `signUp()` may not create a browser session and the payment submission cannot be tied to the user.

## 4. Flow
Registration -> Payment (`251161660`) -> first `NIMELIPIA` click shows `FANYA MALIPO KISHA JARIBU TENA` -> second click allows the paid phone number -> Admin `/admin` sees the submission -> Activate Account -> user is sent to `/dashboard` -> select foreigner -> chat closes after 20 total messages without displaying a message counter.
