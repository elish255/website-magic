import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site/site-context";
import { buildFeed, type Profile } from "@/data/profiles";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BETASHINE" }], links: [{ rel: "canonical", href: `${SITE_URL}/dashboard` }] }),
  component: DashboardPage,
});

type Msg = { from: "you" | "foreigner"; text: string };

function DashboardPage() {
  const navigate = useNavigate();
  const feed = useMemo(() => buildFeed(12), []);
  const [active, setActive] = useState<boolean | null>(null);
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("betashine_selected_foreigner");
    if (saved) setSelected(buildFeed(60).find((p) => p.name === saved) ?? feed[0]!);
    else setSelected(feed[0]!);
  }, [feed]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!mounted) return;
      if (!auth.user) { navigate({ to: "/login" }); return; }
      const { data } = await supabase.from("profiles").select("is_active,balance").eq("id", auth.user.id).maybeSingle();
      if (!data?.is_active) { navigate({ to: "/payment" }); return; }
      setActive(true); setBalance(Number(data.balance ?? 0));
    });
    return () => { mounted = false; };
  }, [navigate]);

  function choose(p: Profile) {
    localStorage.setItem("betashine_selected_foreigner", p.name);
    setSelected(p); setClosed(false); setMessages([{ from: "foreigner", text: `Hi! I'm ${p.name}. I would love to know more about Tanzania. 😊` }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || !selected || closed || messages.length >= 20) return;
    const next = [...messages, { from: "you", text } as Msg];
    setInput("");
    if (next.length >= 20) { setMessages(next); await finishChat(); return; }
    const replies = [
      `That sounds interesting! Tell me more about ${selected.wants.toLowerCase()}.`,
      "Wow, I like that. What would you recommend someone visiting Tanzania try first?",
      "Thank you for explaining that 😊. I'm learning a lot from you.",
      "Haha, that's nice! What is everyday life like where you live?",
      "I didn't know that. Can you teach me a simple Swahili phrase?",
      "Your culture sounds beautiful. What food should I try when I visit?",
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)]!;
    const withReply = [...next, { from: "foreigner", text: reply } as Msg];
    setMessages(withReply);
    if (withReply.length >= 20) await finishChat();
  }

  async function finishChat() {
    if (closed || !selected) return;
    setClosed(true);
    const { data } = await supabase.rpc("complete_chat", { earn_amount: selected.money });
    if (typeof data === "number") setBalance(data);
  }

  if (active === null) return <SiteShell><div className="p-10 text-center font-bold">Inapakia dashboard...</div></SiteShell>;

  return <SiteShell>
    <div className="mx-auto max-w-3xl px-3 py-5">
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">CURRENT BALANCE</p><p className="text-3xl font-extrabold text-primary">TZS {balance.toLocaleString()}</p></div>
          <Link to="/" className="rounded-xl border px-3 py-2 text-sm font-bold">Home</Link>
        </div>
      </div>

      <h2 className="mt-6 text-xl font-extrabold">Chagua Foreigner wa kuongea naye</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {feed.map((p) => <button key={p.name} onClick={() => choose(p)} className={`rounded-2xl bg-card p-4 text-left shadow-card ${selected?.name === p.name ? "ring-2 ring-primary" : ""}`}>
          <div className="flex items-center gap-3"><img src={p.img} alt={p.name} className="size-14 rounded-full border-2 border-teal object-cover"/><div><h3 className="font-extrabold">{p.name} {p.emoji}</h3><p className="text-xs text-success">● online</p><p className="text-xs font-bold">TZS {p.money.toLocaleString()}</p></div></div>
        </button>)}
      </div>

      {selected && <section className="mt-6 overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border p-4"><img src={selected.img} alt={selected.name} className="size-12 rounded-full object-cover"/><div><h2 className="font-extrabold">{selected.name} {selected.emoji}</h2><p className="text-xs text-success">● online</p></div></div>
        <div className="min-h-72 space-y-3 bg-secondary/30 p-4">
          {messages.length === 0 && <div className="text-center text-sm text-muted-foreground">Anzisha mazungumzo na {selected.name}.</div>}
          {messages.map((m, i) => <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${m.from === "you" ? "bg-primary text-primary-foreground" : "bg-card"}`}>{m.text}</div></div>)}
          {closed && <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center text-sm font-bold">Mazungumzo yamekamilika. Mapato yako yameongezwa kwenye balance.</div>}
        </div>
        {!closed && <div className="flex gap-2 border-t border-border p-3"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Andika ujumbe..." className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"/><button onClick={send} className="rounded-xl bg-primary px-4 font-extrabold text-primary-foreground">Tuma</button></div>}
      </section>}
    </div>
  </SiteShell>;
}
