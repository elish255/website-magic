import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      setLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", data.user.id)
        .maybeSingle();
      if (mounted) setBalance(Number(profile?.balance ?? 0));
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/75 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-card p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Funga"
          className="absolute right-5 top-4 text-3xl font-bold leading-none text-muted-foreground"
        >
          ×
        </button>

        <div className="pt-4 text-6xl">💰</div>
        <h2 className="mt-4 text-2xl font-extrabold text-foreground">
          Withdrawal Unavailable
        </h2>

        <div className="mt-5 rounded-2xl bg-secondary px-4 py-4">
          <p className="text-sm font-extrabold tracking-wide text-muted-foreground">
            YOUR CURRENT BALANCE
          </p>
          <p className="mt-1 text-3xl font-extrabold text-primary">
            TZS {balance.toLocaleString()}.00
          </p>
        </div>

        <div className="my-5 h-px bg-border" />

        {!loggedIn ? (
          <>
            <p className="text-base font-semibold leading-7 text-foreground/80">
              ⚠️ Unatakiwa ujisajili na ukamilishe chat ili uweze kupata fedha.
            </p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              📌 Kamilisha chat angalau moja na uweze kulipwa
            </p>
            <Link
              to="/register"
              onClick={onClose}
              className="cta-glow mt-6 block rounded-xl bg-primary px-4 py-4 text-lg font-extrabold text-primary-foreground"
            >
              📝 Jisajili ili Kuendelea
            </Link>
          </>
        ) : (
          <p className="text-base font-semibold leading-7 text-foreground/80">
            📌 Kamilisha chat na foreigner uliemchagua ili mapato yaongezwe kwenye balance yako.
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 font-extrabold text-foreground"
        >
          🔙 Rudi Nyumbani
        </button>
      </div>
    </div>
  );
}
