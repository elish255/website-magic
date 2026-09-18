import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/site-context";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Malipo — BETASHINE" }], links: [{ rel: "canonical", href: `${SITE_URL}/payment` }] }),
  component: PaymentPage,
});

const LIPA_NAMBA = "251161660";

function PaymentPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [paidPrompt, setPaidPrompt] = useState(false);
  const [firstPopup, setFirstPopup] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) navigate({ to: "/register" });
      else setUserId(data.user.id);
    });
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const check = async () => {
      const { data } = await supabase.from("profiles").select("is_active").eq("id", userId).maybeSingle();
      if (data?.is_active) navigate({ to: "/dashboard" });
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [userId, navigate]);

  function handlePaidClick() {
    if (!paidPrompt) {
      setPaidPrompt(true);
      setFirstPopup(true);
      setMessage(null);
      return;
    }
    if (!phone.trim()) {
      setMessage("Weka namba ya simu uliyotumia kufanya malipo.");
      return;
    }
    if (!userId) return;
    setSaving(true);
    supabase.from("payment_submissions").insert({ user_id: userId, paid_phone: phone.trim() }).then(({ error }) => {
      setSaving(false);
      if (error) {
        setMessage("Taarifa haijatumwa. Kama tayari umetuma, subiri admin akuthibitishe.");
      } else {
        setMessage("Taarifa ya malipo imetumwa. Subiri akaunti yako i-activate.");
      }
    });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-3 py-6">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h1 className="text-center text-2xl font-extrabold">💳 FANYA MALIPO</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Lipia TZS 14,500 kisha tuma namba uliyolipia.</p>

          <div className="mt-5 rounded-xl border border-teal/40 bg-secondary p-4 text-center">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">LIPA NAMBA</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <strong className="text-3xl text-primary">{LIPA_NAMBA}</strong>
              <button onClick={() => navigator.clipboard?.writeText(LIPA_NAMBA)} className="rounded-lg border px-2 py-1 text-xs font-bold">Copy</button>
            </div>
            <p className="mt-2 text-sm font-bold">Jina la Biashara: ASSERT BRIDGE</p>
          </div>

          <div className="mt-5 space-y-3">
            <PaymentMethod logo="https://brandlogos.net/wp-content/uploads/2025/04/vodacom-logo_brandlogos.net_4uzfe.png" name="Vodacom M-Pesa" steps={["*150*00#", "Lipa kwa M-PESA", `Lipa kwa namba ${LIPA_NAMBA}`, "Weka TZS 14,500"]} />
            <PaymentMethod logo="https://www.uminolan.co.tz/assets/images/supa-agent/mixx-by-yas-seeklogo2.png" name="Mixx by Yas" steps={["*150*01#", "Lipa kwa simu", `Chagua namba ya malipo ${LIPA_NAMBA}`, "Weka TZS 14,500"]} />
            <PaymentMethod logo="https://nikulipe.com/wp-content/uploads/2022/09/Airtel_logo_PNG1.png" name="Airtel Money" steps={["*150*60#", "Lipia Bili", `Ingiza namba ya malipo ${LIPA_NAMBA}`, "Weka TZS 14,500"]} />
            <PaymentMethod logo="https://halopesa.co.tz/images/applications-system.png" name="Halopesa" steps={["*150*88#", "Lipia Bidhaa", `Weka namba ya malipo ${LIPA_NAMBA}`, "Weka TZS 14,500"]} />
          </div>

          {paidPrompt && !firstPopup && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-extrabold">Umeshalipia?</p>
              <p className="mt-1 text-sm text-muted-foreground">Weka namba ya simu uliyotumia kufanya malipo.</p>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="0712345678" className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-3 outline-none" />
            </div>
          )}

          {firstPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/70 p-4 backdrop-blur-sm">
              <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-card">
                <button onClick={() => setFirstPopup(false)} className="absolute right-4 top-3 text-2xl text-muted-foreground">×</button>
                <div className="text-5xl">💳</div>
                <h2 className="mt-3 text-2xl font-extrabold">FANYA MALIPO KISHA JARIBU TENA</h2>
                <p className="mt-3 text-sm text-muted-foreground">Kamilisha malipo ya TZS 14,500 kwa kutumia maelekezo hapo juu.</p>
                <button onClick={() => setFirstPopup(false)} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground">Sawa</button>
              </div>
            </div>
          )}

          {message && <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-semibold">{message}</p>}

          <button onClick={handlePaidClick} disabled={saving} className="cta-glow mt-5 w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60">
            {saving ? "Inatuma..." : "✅ NIMELIPIA"}
          </button>
          <Link to="/" className="mt-3 block text-center font-bold">← Rudi nyuma</Link>
        </div>
      </div>
    </SiteShell>
  );
}

function PaymentMethod({ logo, name, steps }: { logo: string; name: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  return <div className="overflow-hidden rounded-xl border border-border">
    <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left">
      <img src={logo} alt={name} className="size-10 rounded-lg object-contain" />
      <span className="flex-1 font-extrabold">{name}</span><span>{open ? "⌃" : "⌄"}</span>
    </button>
    {open && <ol className="space-y-2 border-t border-border bg-secondary/40 p-4 text-sm">{steps.map((s, i) => <li key={s}><span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>{s}</li>)}</ol>}
  </div>;
}
