import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted || !data.user) return;
      setLoggedIn(true);
      const { data: profile } = await supabase.from("profiles").select("balance,phone,is_active,is_banned").eq("id", data.user.id).maybeSingle();
      if (mounted) {
        setBalance(Number(profile?.balance ?? 0));
        setPhone(profile?.phone ?? "");
      }
    });
    return () => { mounted = false; };
  }, []);

  async function submit() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setMessage("Weka kiasi sahihi.");
    if (value > balance) return setMessage("Kiasi unachoomba kinazidi balance yako.");
    if (!phone.trim()) return setMessage("Weka namba ya simu ya kupokea malipo.");
    setSaving(true); setMessage("");
    const { error } = await supabase.from("withdrawal_requests").insert({ amount: value, phone: phone.trim(), user_id: (await supabase.auth.getUser()).data.user!.id });
    setSaving(false);
    if (error) setMessage(error.message);
    else setMessage("Ombi la withdrawal limetumwa. Subiri admin alikague.");
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/75 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-card p-6 shadow-2xl">
      <button onClick={onClose} aria-label="Funga" className="absolute right-5 top-4 text-3xl font-bold leading-none text-muted-foreground">×</button>
      <div className="pt-3 text-center"><div className="text-5xl">💰</div><h2 className="mt-3 text-2xl font-extrabold">Cash Out</h2></div>
      <div className="mt-4 rounded-2xl bg-secondary px-4 py-4 text-center"><p className="text-xs font-extrabold tracking-wide text-muted-foreground">YOUR CURRENT BALANCE</p><p className="mt-1 text-3xl font-extrabold text-primary">TZS {balance.toLocaleString()}.00</p></div>
      {!loggedIn ? <><p className="mt-5 text-center font-semibold">⚠️ Ingia au jisajili kwanza ili uombe withdrawal.</p><Link to="/register" onClick={onClose} className="cta-glow mt-5 block rounded-xl bg-primary px-4 py-3 text-center font-extrabold text-primary-foreground">📝 Jisajili</Link></> : <div className="mt-5 space-y-3">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" max={balance} placeholder="Kiasi cha withdrawal" className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="0712345678" className="w-full rounded-xl border border-input bg-background px-3 py-3 outline-none" />
        <button disabled={saving} onClick={submit} className="w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60">{saving ? "Inatuma..." : "✅ Tuma Withdrawal"}</button>
        {message && <p className="rounded-xl bg-secondary px-3 py-2 text-center text-sm font-semibold">{message}</p>}
      </div>}
      <button onClick={onClose} className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 font-extrabold">Funga</button>
    </div>
  </div>;
}
