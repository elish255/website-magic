import { Link } from "@tanstack/react-router";
import { LOGO_URL } from "@/lib/site";
import { useSite } from "./site-context";

export function Footer() {
  const { openWithdraw } = useSite();

  return (
    <footer className="brand-surface mt-8 px-4 pb-8 pt-6">
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <img
            src={LOGO_URL}
            alt="BETASHINE — Connect, Learn, Earn"
            className="h-20 w-auto max-w-full rounded-xl object-contain object-left"
          />
          <p className="text-sm text-brand-foreground/70">
            Connect, Learn, Earn.
            <br />
            Get paid to chat with foreigners.
            <br />
            Share your culture and earn money.
          </p>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-extrabold text-teal">Quick Links</h4>
          <ul className="space-y-2 text-sm text-brand-foreground/70">
            <li><Link to="/">🏠 Home</Link></li>
            <li><Link to="/register">📝 Jisajili</Link></li>
            <li><button onClick={openWithdraw}>💰 Withdraw</button></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl border-t border-teal/20 pt-4 text-center text-xs text-brand-foreground/60">
        © 2026 BetaShine · Connect, Learn, Earn.
      </div>
    </footer>
  );
}
