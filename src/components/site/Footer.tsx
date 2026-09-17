import { Link } from "@tanstack/react-router";
import { LOGO_URL, SUPPORT_PHONE } from "@/lib/site";
import { useSite } from "./site-context";

export function Footer() {
  const { openWithdraw, openContact } = useSite();

  return (
    <footer className="brand-surface mt-8 px-4 pb-8 pt-6">
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <img
            src={LOGO_URL}
            alt="BetaShine"
            className="size-12 rounded-full border border-teal/50 object-cover"
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
          <ul className="space-y-1.5 text-sm text-brand-foreground/70">
            <li>
              <Link to="/">🏠 Home</Link>
            </li>
            <li>
              <Link to="/register">📝 Jisajili</Link>
            </li>
            <li>
              <button onClick={openWithdraw}>💰 Withdraw</button>
            </li>
            <li>
              <button onClick={openContact}>💬 Contact Us</button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-extrabold text-teal">Contact</h4>
          <p className="text-sm text-brand-foreground/70">
            📱{" "}
            <button onClick={openContact} className="underline">
              Contact Options
            </button>
          </p>
          <p className="text-sm text-brand-foreground/70">{SUPPORT_PHONE}</p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl border-t border-teal/20 pt-4 text-center text-xs text-brand-foreground/60">
        © 2026 BetaShine · Connect, Learn, Earn.
      </div>
    </footer>
  );
}
