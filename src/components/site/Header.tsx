import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LOGO_URL } from "@/lib/site";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "./site-context";

export function Header() {
  const { openWithdraw } = useSite();
  const [live, setLive] = useState(164_828);
  const [balance, setBalance] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setLive((prev) => {
        const step = Math.floor(Math.random() * 180) + 20;
        const next = Math.random() > 0.5 ? prev + step : prev - step;
        return Math.min(201_800, Math.max(139_000, next));
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoggedIn(false); return; }
      setLoggedIn(true);
      const { data } = await supabase.from("profiles").select("balance").eq("id", auth.user.id).maybeSingle();
      if (data) setBalance(Number(data.balance ?? 0));
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { load(); });
    const timer = setInterval(load, 7000);
    return () => { clearInterval(timer); listener.subscription.unsubscribe(); };
  }, []);

  return (
    <header className="brand-surface sticky top-0 z-30 border-b-2 border-teal/60">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
        <Link to="/" className="min-w-0 shrink">
          <img
            src={LOGO_URL}
            alt="BETASHINE — Connect, Learn, Earn"
            className="h-12 w-auto max-w-[155px] rounded-lg object-contain object-left sm:h-14 sm:max-w-[190px]"
          />
        </Link>

        <div className="hidden items-center gap-1.5 rounded-full border border-teal/50 bg-brand-deep/50 px-3 py-1.5 sm:flex">
          <span className="size-2 animate-pulse rounded-full bg-teal" />
          <span className="text-xs font-bold text-teal">{live.toLocaleString()} live</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to={loggedIn ? "/dashboard" : "/login"}
            className="rounded-lg border border-teal/50 px-3 py-2 text-xs font-extrabold text-brand-foreground transition-transform active:scale-95"
          >
            {loggedIn ? "📊 Dashboard" : "🔐 Login"}
          </Link>
          <button
            onClick={openWithdraw}
            className="cta-glow rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition-transform active:scale-95"
          >
            💰 Withdraw
          </button>
          <div className="hidden flex-col rounded-lg border border-teal/40 bg-brand-deep/40 px-3 py-1.5 text-right sm:flex">
            <span className="text-[9px] font-bold tracking-widest text-teal/80">CURRENT BALANCE</span>
            <span className="text-sm font-extrabold text-brand-foreground">TZS {balance.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
