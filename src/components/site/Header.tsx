import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LOGO_URL } from "@/lib/site";
import { useSite } from "./site-context";

export function Header() {
  const { openWithdraw } = useSite();
  const [live, setLive] = useState(164_828);

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

  return (
    <header className="brand-surface sticky top-0 z-30 border-b-2 border-teal/60">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
        <Link to="/" className="shrink-0">
          <img
            src={LOGO_URL}
            alt="BetaShine"
            className="size-10 rounded-full border border-teal/50 object-cover"
          />
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-teal/50 bg-brand-deep/50 px-3 py-1.5">
          <span className="size-2 animate-pulse rounded-full bg-teal" />
          <span className="text-xs font-bold text-teal">
            {live.toLocaleString()} live
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={openWithdraw}
            className="cta-glow rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition-transform active:scale-95"
          >
            💰 Withdraw
          </button>
          <div className="flex flex-col rounded-lg border border-teal/40 bg-brand-deep/40 px-3 py-1.5 text-right">
            <span className="text-[9px] font-bold tracking-widest text-teal/80">
              CURRENT BALANCE
            </span>
            <span className="text-sm font-extrabold text-brand-foreground">
              TZS 0.00
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
