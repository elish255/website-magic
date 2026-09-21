import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/site/site-context";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Malipo — BETASHINE" }], links: [{ rel: "canonical", href: `${SITE_URL}/payment` }] }),
  component: PaymentPage,
});

const LIPA_NAMBA = "251231096";
const PRICE = 16000;

type Method = "automatic" | "manual";

function PaymentPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("automatic");
  const [paidPrompt, setPaidPrompt] = useState(false);
  const [firstPopup, setFirstPopup] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latestStatus, setLatestStatus] = useState<string | null>(null);
  const [autoPaymentId, setAutoPaymentId] = useState<string | null>(null);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const { data: profile } = await supabase.from("profiles").select("is_active,is_banned,phone").eq("id", userId).maybeSingle();
      if (profile?.phone && !phone) setPhone(profile.phone);
      if (profile?.is_banned) { setMessage("Account yako imezuiwa. Wasiliana na admin."); return; }
      if (profile?.is_active) { navigate({ to: "/dashboard" }); return; }
      const { data: payment } = await supabase.from("payment_submissions").select("status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setLatestStatus(payment?.status ?? null);
    };
    check();
    const timer = setInterval(check, 5000);
    return () => clearInterval(timer);
  }, [userId, navigate, phone]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  async function callFimiPayApi(body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Login session imekwisha. Ingia tena.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);

    try {
      const response = await fetch("/api/fimipay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.error || "Server imeshindwa kushughulikia malipo.");
      }
      return data;
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
        throw new Error("Imeshindikana kutuma Push. Jaribu tena.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function pollAutomaticPayment(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    const check = async () => {
      try {
        const data = await callFimiPayApi({ action: "status", paymentId });
        setAutoStatus(String(data.status ?? data.paymentStatus ?? "pending"));
        if (data.paid) {
          if (pollRef.current) clearInterval(pollRef.current);
          navigate({ to: "/dashboard" });
        }
      } catch (error) {
        console.error("FimiPay status check failed", error);
      }
    };
    await check();
    pollRef.current = setInterval(check, 4000);
  }

  async function startAutomaticPayment() {
    if (!phone.trim()) {
      setMessage("Weka namba ya simu ya M-Pesa/Mixx/Airtel Money/HaloPesa unayotaka Kulipia.");
      return;
    }
    setSaving(true);
    setMessage("Push imetumwa Weka namba ya Siri kuthibisha Malipo");
    setCheckoutUrl(null);
    try {
      const data = await callFimiPayApi({ action: "create", phone: phone.trim() });
      if (!data?.ok) throw new Error(data?.error || "FimiPay imeshindwa kuanzisha malipo.");
      if (data.alreadyActive || data.paid) {
        navigate({ to: "/dashboard" });
        return;
      }
      setAutoPaymentId(data.paymentId ?? null);
      setAutoStatus(data.status ?? "pending");
      setCheckoutUrl(data.checkoutUrl ?? null);
      setMessage("Push imetumwa Weka namba ya Siri kuthibisha Malipo");
      if (data.paymentId) await pollAutomaticPayment(data.paymentId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Imeshindikana kuanzisha malipo ya automatic.");
    } finally {
      setSaving(false);
    }
  }

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
        setLatestStatus("pending");
        setMessage("Taarifa ya malipo imetumwa. Subiri akaunti yako i-activate.");
      }
    });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-3 py-6">
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h1 className="text-center text-2xl font-extrabold">💳 FANYA MALIPO</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Lipia TZS {PRICE.toLocaleString()} na akaunti yako ita-activate automatically baada ya malipo kuthibitishwa.</p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
            <button onClick={() => { setMethod("automatic"); setMessage(null); }} className={`rounded-lg px-3 py-3 text-sm font-extrabold ${method === "automatic" ? "bg-primary text-primary-foreground" : ""}`}>
              ⚡ Automatic Push
            </button>
            <button onClick={() => { setMethod("manual"); setMessage(null); }} className={`rounded-lg px-3 py-3 text-sm font-extrabold ${method === "manual" ? "bg-primary text-primary-foreground" : ""}`}>
              🧾 Manual Payment
            </button>
          </div>

          {method === "automatic" ? (
            <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="text-center text-5xl">⚡</div>
              <h2 className="mt-3 text-center text-xl font-extrabold">LIPA KWA PUSH</h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">Weka namba ya simu ya M-Pesa/Mixx/Airtel Money/HaloPesa unayotaka Kulipia.</p>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="0712345678" className="mt-4 w-full rounded-xl border border-input bg-background px-3 py-3 outline-none" />
              <button onClick={startAutomaticPayment} disabled={saving || !phone.trim()} className="cta-glow mt-3 w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60">
                {saving ? "Inatuma Push..." : `⚡ LIPA TZS ${PRICE.toLocaleString()} KWA PUSH`}
              </button>

              {autoPaymentId && <div className="mt-4 rounded-xl border border-border bg-background p-3 text-center text-sm">
                <p className="font-extrabold">Status: {autoStatus ?? "pending"}</p>
                <p className="mt-1 text-muted-foreground">Usifunge ukurasa mpaka malipo yakamilike.</p>
                {checkoutUrl && <a href={checkoutUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg border px-3 py-2 font-bold">Fungua FimiPay Checkout</a>}
              </div>}
            </div>
          ) : (
            <ManualPayment
              paidPrompt={paidPrompt}
              firstPopup={firstPopup}
              phone={phone}
              setPhone={setPhone}
              saving={saving}
              onPaid={handlePaidClick}
              closePopup={() => setFirstPopup(false)}
              latestStatus={latestStatus}
            />
          )}

          {message && <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-semibold">{message}</p>}
          <Link to="/" className="mt-4 block text-center font-bold">← Rudi nyuma</Link>
        </div>
      </div>
    </SiteShell>
  );
}

function ManualPayment({ paidPrompt, firstPopup, phone, setPhone, saving, onPaid, closePopup, latestStatus }: {
  paidPrompt: boolean; firstPopup: boolean; phone: string; setPhone: (v: string) => void; saving: boolean; onPaid: () => void; closePopup: () => void; latestStatus: string | null;
}) {
  return <>
    <div className="mt-5 rounded-xl border border-teal/40 bg-secondary p-4 text-center">
      <p className="text-xs font-bold tracking-widest text-muted-foreground">LIPA NAMBA</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <strong className="text-3xl text-primary">{LIPA_NAMBA}</strong>
        <button onClick={() => navigator.clipboard?.writeText(LIPA_NAMBA)} className="rounded-lg border px-2 py-1 text-xs font-bold">Copy</button>
      </div>
      <p className="mt-2 text-sm font-bold">Jina la Biashara: BETASHINE ORG</p>
    </div>

    <div className="mt-5 space-y-3">
      <PaymentMethod logo="https://brandlogos.net/wp-content/uploads/2025/04/vodacom-logo_brandlogos.net_4uzfe.png" name="Vodacom M-Pesa" steps={["*150*00#", "Lipa kwa M-PESA", `Lipa kwa namba ${LIPA_NAMBA}`, `Weka TZS ${PRICE.toLocaleString()}`]} />
      <PaymentMethod logo="https://www.uminolan.co.tz/assets/images/supa-agent/mixx-by-yas-seeklogo2.png" name="Mixx by Yas" steps={["*150*01#", "Lipa kwa simu", `Chagua namba ya malipo ${LIPA_NAMBA}`, `Weka TZS ${PRICE.toLocaleString()}`]} />
      <PaymentMethod logo="https://nikulipe.com/wp-content/uploads/2022/09/Airtel_logo_PNG1.png" name="Airtel Money" steps={["*150*60#", "Lipia Bili", `Ingiza namba ya malipo ${LIPA_NAMBA}`, `Weka TZS ${PRICE.toLocaleString()}`]} />
      <PaymentMethod logo="https://halopesa.co.tz/images/applications-system.png" name="Halopesa" steps={["*150*88#", "Lipia Bidhaa", `Weka namba ya malipo ${LIPA_NAMBA}`, `Weka TZS ${PRICE.toLocaleString()}`]} />
    </div>

    {paidPrompt && !firstPopup && <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="font-extrabold">Umeshalipia?</p>
      <p className="mt-1 text-sm text-muted-foreground">Weka namba ya simu uliyotumia kufanya malipo.</p>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="0712345678" className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-3 outline-none" />
    </div>}

    {firstPopup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-card">
        <button onClick={closePopup} className="absolute right-4 top-3 text-2xl text-muted-foreground">×</button>
        <div className="text-5xl">💳</div>
        <h2 className="mt-3 text-2xl font-extrabold">FANYA MALIPO KISHA JARIBU TENA</h2>
        <p className="mt-3 text-sm text-muted-foreground">Kamilisha malipo ya TZS {PRICE.toLocaleString()} kwa kutumia maelekezo hapo juu.</p>
        <button onClick={closePopup} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground">Sawa</button>
      </div>
    </div>}

    {latestStatus === "pending" && <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center text-sm font-semibold">⏳ Malipo yako yapo kwenye review ya admin. Tafadhali subiri.</div>}
    {latestStatus === "rejected" && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm font-semibold">❌ Malipo haya yamekataliwa. Hakikisha taarifa za malipo ni sahihi kisha tuma tena.</div>}
    <button onClick={onPaid} disabled={saving} className="cta-glow mt-5 w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60">
      {saving ? "Inatuma..." : "✅ NIMELIPIA"}
    </button>
  </>;
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
