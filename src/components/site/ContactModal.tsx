import { SUPPORT_PHONE, WHATSAPP_CHANNEL } from "@/lib/site";

export function ContactModal({ onClose }: { onClose: () => void }) {
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

        <div className="text-4xl">📞</div>
        <h2 className="mt-2 text-xl font-bold">Contact Customer Support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to reach us
        </p>

        <div className="mt-5 space-y-3 text-left">
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3"
          >
            <span className="text-2xl">🟢</span>
            <span className="flex-1">
              <span className="block font-bold">Follow WhatsApp Channel</span>
              <span className="block text-xs text-muted-foreground">
                Connect with our community and get support
              </span>
            </span>
            <span className="text-lg">→</span>
          </a>

          <a
            href={`sms:${SUPPORT_PHONE}?body=Habari,%20nina%20swali%20kuhusu%20BetaShine`}
            className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3"
          >
            <span className="text-2xl">💬</span>
            <span className="flex-1">
              <span className="block font-bold">Send SMS</span>
              <span className="block text-xs text-muted-foreground">
                Send us a text message ({SUPPORT_PHONE})
              </span>
            </span>
            <span className="text-lg">→</span>
          </a>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-border px-4 py-3 font-bold"
        >
          🔙 Funga
        </button>
      </div>
    </div>
  );
}
