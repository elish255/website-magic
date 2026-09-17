import { Link } from "@tanstack/react-router";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-card">
        <button
          onClick={onClose}
          aria-label="Funga"
          className="absolute right-4 top-3 text-2xl leading-none text-muted-foreground"
        >
          ×
        </button>

        <div className="text-5xl">💰</div>
        <h2 className="mt-3 text-2xl font-bold">Withdrawal Unavailable</h2>

        <div className="mt-4 rounded-xl bg-secondary px-4 py-3">
          <p className="text-xs font-extrabold tracking-widest text-muted-foreground">
            YOUR CURRENT BALANCE
          </p>
          <p className="text-3xl font-extrabold text-primary">TZS 0.00</p>
        </div>

        <div className="mt-4 border-t border-border pt-4 text-sm">
          <p>
            ⚠️ Unatakiwa <strong>ujisajili</strong> na ukamilishe chat ili uweze
            kupata fedha.
          </p>
          <p className="mt-1 text-muted-foreground">
            📌 Kamilisha chat angalau moja na uweze kulipwa
          </p>
        </div>

        <Link
          to="/register"
          onClick={onClose}
          className="cta-glow mt-5 block rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground"
        >
          📝 Jisajili ili Kuendelea
        </Link>
        <Link
          to="/"
          onClick={onClose}
          className="mt-3 block rounded-xl border border-border px-4 py-3 font-bold"
        >
          🔙 Rudi Nyumbani
        </Link>
      </div>
    </div>
  );
}
