import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteShell } from "@/components/site/site-context";
import { buildFeed, type Profile } from "@/data/profiles";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/dashboard")({ head: () => ({ meta: [{ title: "Dashboard — BETASHINE" }], links: [{ rel: "canonical", href: `${SITE_URL}/dashboard` }] }), component: DashboardPage });
type Msg = { from: "you" | "foreigner"; text: string };
type Notification = { id: string; title: string; message: string; created_at: string };

type ProfileRow = { username: string; full_name: string; balance: number; expenses: number; bonus: number; is_active: boolean; is_banned: boolean; phone: string };

function DashboardPage() {
  const navigate = useNavigate();
  const feed = useMemo(() => buildFeed(12), []);
  const [active, setActive] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [closed, setClosed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function loadUser(userId: string) {
    const { data, error } = await supabase.from("profiles").select("username,full_name,balance,expenses,bonus,is_active,is_banned,phone").eq("id", userId).maybeSingle();
    if (error || !data) return;
    if (data.is_banned) { setActive(false); return; }
    if (!data.is_active) { navigate({ to: "/payment" }); return; }
    setProfile(data as ProfileRow); setActive(true);
    const { data: notes } = await supabase.from("notifications").select("id,title,message,created_at").eq("user_id", userId).is("dismissed_at", null).order("created_at", { ascending: false }).limit(10);
    setNotifications((notes ?? []) as Notification[]);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) navigate({ to: "/login" }); else loadUser(data.user.id);
    });
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    const saved = localStorage.getItem("betashine_selected_foreigner");
    if (saved) setSelected(buildFeed(60).find((p) => p.name === saved) ?? feed[0]!); else setSelected(feed[0]!);
  }, [feed]);

  async function dismiss(id: string) {
    await supabase.from("notifications").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
    setNotifications((items) => items.filter((n) => n.id !== id));
  }
  function choose(p: Profile) { localStorage.setItem("betashine_selected_foreigner", p.name); setSelected(p); setClosed(false); setMessages([{ from: "foreigner", text: `Hi! I'm ${p.name}. I would love to know more about Tanzania. 😊` }]); }
  async function finishChat() {
    if (closed || !selected) return; setClosed(true);
    const { data } = await supabase.rpc("complete_chat", { earn_amount: selected.money });
    if (typeof data === "number") setProfile((p) => p ? { ...p, balance: data } : p);
  }
  async function send() {
    const text = input.trim(); if (!text || !selected || closed || messages.length >= 20) return;
    const next = [...messages, { from: "you", text } as Msg]; setInput("");
    if (next.length >= 20) { setMessages(next); await finishChat(); return; }
    const replies = [
      `That sounds interesting! Tell me more about ${selected.wants.toLowerCase()}.`,
      "Wow, I like that. What would you recommend someone visiting Tanzania try first?",
      "Thank you for explaining that 😊. I'm learning a lot from you.",
      "Haha, that's nice! What is everyday life like where you live?",
      "I didn't know that. Can you teach me a simple Swahili phrase?",
      "Your culture sounds beautiful. What food should I try when I visit?",
    ];
    const withReply = [...next, { from: "foreigner", text: replies[Math.floor(Math.random() * replies.length)]! } as Msg]; setMessages(withReply);
    if (withReply.length >= 20) await finishChat();
  }

  if (active === false) return <SiteShell><div className="mx-auto max-w-md px-4 py-16 text-center"><div className="rounded-3xl bg-card p-7 shadow-card"><div className="text-5xl">🔒</div><h1 className="mt-3 text-2xl font-extrabold">Account imezuiwa</h1><p className="mt-2 text-sm text-muted-foreground">Wasiliana na admin kwa msaada zaidi.</p><Link to="/" className="mt-5 inline-block rounded-xl bg-primary px-5 py-3 font-extrabold text-primary-foreground">Rudi Home</Link></div></div></SiteShell>;
  if (active === null || !profile) return <SiteShell><div className="p-10 text-center font-bold">Inapakia dashboard...</div></SiteShell>;

  return <SiteShell>
    <div className="mx-auto max-w-5xl px-3 py-5">
      {notifications.length > 0 && <div className="mb-5 space-y-3">{notifications.map((n) => <div key={n.id} className="relative rounded-3xl bg-slate-800 p-5 text-white shadow-card"><button onClick={() => dismiss(n.id)} className="absolute right-3 top-3 rounded-full bg-white/10 px-2.5 py-1 text-lg" aria-label="Dismiss">×</button><div className="mb-2 inline-block rounded-full bg-sky-500/30 px-3 py-1 text-xs font-extrabold tracking-widest">SYSTEM BROADCAST</div><h2 className="pr-8 text-xl font-black">{n.title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-100">{n.message}</p></div>)}</div>}

      <div className="mb-4 flex items-center gap-3"><div className="grid size-14 place-items-center rounded-full bg-cyan-500 text-xl font-black text-white">{profile.username.slice(0,1).toUpperCase()}</div><div><h1 className="text-2xl font-black">Welcome back, {profile.username}</h1><p className="text-sm text-muted-foreground">Here's how your earnings are looking today.</p></div></div>

      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 to-cyan-500 p-5 text-white shadow-card"><p className="text-sm font-black tracking-widest">↗ NET INCOME</p><div className="mt-2 flex items-end gap-2"><p className="text-4xl font-black">{profile.balance.toLocaleString()}.00</p><p className="pb-1 text-xl">TZS</p></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/15 p-4"><p className="text-xs font-bold opacity-80">EXPENSES</p><p className="mt-1 text-xl font-black">{profile.expenses.toLocaleString()}.00 TZS</p></div><div className="rounded-2xl bg-white/15 p-4"><p className="text-xs font-bold opacity-80">BONUS</p><p className="mt-1 text-xl font-black">{profile.bonus.toLocaleString()}.00 TZS</p></div></div></section>

      <div className="mt-4 grid grid-cols-3 gap-2"><button onClick={() => navigator.share?.({ title: "BETASHINE", text: `Ninafanya kazi na BETASHINE — ${profile.username}` })} className="rounded-2xl bg-card px-3 py-4 font-extrabold shadow-card">↗ Share</button><button onClick={() => document.getElementById("chat-section")?.scrollIntoView({ behavior: "smooth" })} className="rounded-2xl bg-card px-3 py-4 font-extrabold shadow-card">👤 Pay Client</button><button onClick={() => window.dispatchEvent(new Event("betashine:open-withdraw")) className="rounded-2xl bg-card px-3 py-4 font-extrabold shadow-card">▣ Cash Out</button></div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-3xl bg-card p-5 shadow-card"><div className="flex justify-between"><span className="text-xs font-black tracking-widest text-muted-foreground">MOXERA AGENCIES</span><strong className="text-2xl">{profile.balance.toLocaleString()}.00</strong></div><p className="mt-4 font-semibold text-muted-foreground">Balance</p><div className="mt-3 h-2 rounded-full bg-secondary"><div className="h-2 w-1/4 rounded-full bg-teal" /></div></div><div className="rounded-3xl bg-card p-5 shadow-card"><div className="flex justify-between"><span className="text-xs font-black tracking-widest text-muted-foreground">MOXERA AGENCIES</span><strong className="text-2xl">{profile.expenses.toLocaleString()}.00</strong></div><p className="mt-4 font-semibold text-muted-foreground">Expenses</p><div className="mt-3 h-2 rounded-full bg-secondary"><div className="h-2 w-1/2 rounded-full bg-primary" /></div></div></div>

      <div id="chat-section"><h2 className="mt-8 text-xl font-extrabold">Chagua Foreigner wa kuongea naye</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{feed.map((p) => <button key={p.name} onClick={() => choose(p)} className={`rounded-2xl bg-card p-4 text-left shadow-card ${selected?.name === p.name ? "ring-2 ring-primary" : ""}`}><div className="flex items-center gap-3"><img src={p.img} alt={p.name} className="size-14 rounded-full border-2 border-teal object-cover"/><div><h3 className="font-extrabold">{p.name} {p.emoji}</h3><p className="text-xs text-success">● online</p><p className="text-xs font-bold">TZS {p.money.toLocaleString()}</p></div></div></button>)}</div></div>
      {selected && <section className="mt-6 overflow-hidden rounded-2xl bg-card shadow-card"><div className="flex items-center gap-3 border-b border-border p-4"><img src={selected.img} alt={selected.name} className="size-12 rounded-full object-cover"/><div><h2 className="font-extrabold">{selected.name} {selected.emoji}</h2><p className="text-xs text-success">● online</p></div></div><div className="min-h-72 space-y-3 bg-secondary/30 p-4">{messages.length === 0 && <div className="text-center text-sm text-muted-foreground">Anzisha mazungumzo na {selected.name}.</div>}{messages.map((m,i)=><div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${m.from === "you" ? "bg-primary text-primary-foreground" : "bg-card"}`}>{m.text}</div></div>)}{closed && <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center text-sm font-bold">Mazungumzo yamekamilika. Mapato yako yameongezwa kwenye balance.</div>}</div>{!closed && <div className="flex gap-2 border-t border-border p-3"><input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()} placeholder="Andika ujumbe..." className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none"/><button onClick={send} className="rounded-xl bg-primary px-4 font-extrabold text-primary-foreground">Tuma</button></div>}</section>}
    </div>
  </SiteShell>;
}
