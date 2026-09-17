import { WHATSAPP_CHANNEL } from "@/lib/site";

export function SupportFab() {
  return (
    <a
      href={WHATSAPP_CHANNEL}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2"
    >
      <span className="rounded-full bg-success px-3 py-1.5 text-xs font-bold text-brand-foreground shadow-card">
        💬 customer assistance
      </span>
      <span className="grid size-12 place-items-center rounded-full bg-success text-2xl shadow-card">
        📱
      </span>
    </a>
  );
}
