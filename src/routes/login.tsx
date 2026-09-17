import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site/site-context";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, SEO_KEYWORDS } from "@/lib/site";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — BETASHINE" },
      { name: "keywords", content: SEO_KEYWORDS },
      { name: "description", content: "Ingia kwenye account yako ya BETASHINE na ufikie dashboard yako." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/login` }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Jaza email na password.");
      return;
    }
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("email not confirmed")) setError("Email yako bado haijathibitishwa. Thibitisha email kwanza.");
      else if (msg.includes("invalid login credentials")) setError("Email au password si sahihi.");
      else setError(`Imeshindikana kuingia: ${authError.message}`);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Imeshindikana kuingia. Jaribu tena.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setError(`Account imeingia lakini profile haijasomeka: ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (profile?.is_active) navigate({ to: "/dashboard" });
    else navigate({ to: "/payment" });
    setLoading(false);
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-8">
        <div className="rounded-2xl bg-card p-6 shadow-card">
          <h1 className="text-center text-2xl font-black">🔐 Ingia</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Ingia kwenye account yako ili kufikia dashboard.
          </p>

          <form onSubmit={login} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="juma@gmail.com"
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Password yako"
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-ring"
              />
            </label>

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="cta-glow w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Inaingia..." : "🔐 INGIA KWENYE ACCOUNT"}
            </button>
          </form>

          <div className="mt-4 grid gap-2">
            <Link to="/register" className="rounded-xl border border-border px-4 py-3 text-center font-bold">
              📝 Huna account? Jisajili
            </Link>
            <Link to="/" className="rounded-xl border border-border px-4 py-3 text-center font-bold">
              🔙 Rudi Nyumbani
            </Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
