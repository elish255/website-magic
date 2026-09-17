import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteShell } from "@/components/site/site-context";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, SEO_KEYWORDS } from "@/lib/site";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Jisajili — BETASHINE" },
      { name: "keywords", content: SEO_KEYWORDS },
      {
        name: "description",
        content:
          "Jisajili kwenye BetaShine: jaza jina, email, username, namba ya simu, nchi na password ili uanze kuchat na wageni na kupata malipo.",
      },
      { property: "og:title", content: "Jisajili — BETASHINE ORIGINAL" },
      {
        property: "og:description",
        content:
          "Fungua akaunti yako ya BetaShine na uanze kupata mapato kwa kuchat na wageni.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/register` }],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(3, "Andika jina kamili").max(100),
    email: z.string().trim().email("Andika email sahihi").max(120),
    username: z
      .string()
      .trim()
      .min(3, "Username iwe na herufi 3 au zaidi")
      .max(30)
      .regex(/^[a-zA-Z0-9_.]+$/, "Username itumie herufi, namba, _ au . tu"),
    phone: z
      .string()
      .trim()
      .min(9, "Andika namba ya simu sahihi")
      .max(15)
      .regex(/^[0-9+]+$/, "Namba ya simu itumie namba tu"),
    county: z.string().trim().min(2, "Andika mkoa/county").max(60),
    password: z.string().min(6, "Password iwe na herufi 6 au zaidi").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Password hazifanani",
  });

type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  fullName: "",
  email: "",
  username: "",
  phone: "",
  county: "",
  password: "",
  confirmPassword: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const setCountry = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setValues((v) => ({ ...v, county: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof Values, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Values;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);

    const data = parsed.data;
    const username = data.username.toLowerCase();

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          username,
          phone: data.phone,
          county: data.county,
        },
      },
    });

    if (error) {
      setLoading(false);
      setFormError(
        /already registered|already exists|duplicate|exists/i.test(error.message)
          ? "Email au username hii imetumika. Chagua nyingine."
          : "Imeshindikana kujisajili. Jaribu tena.",
      );
      return;
    }

    setLoading(false);
    setValues(EMPTY);
    navigate({ to: "/payment" });
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl bg-card p-6 shadow-card">
          <h1 className="text-center text-2xl font-bold">📝 Jisajili</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Jaza taarifa zako ili uanze kupata malipo kwa kuchat na wageni.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field
              label="Jina kamili"
              value={values.fullName}
              onChange={set("fullName")}
              error={errors.fullName}
              placeholder="Juma Ally Hassan"
              autoComplete="name"
            />
            <Field
              label="Email"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
              placeholder="juma@gmail.com"
              type="email"
              autoComplete="email"
              inputMode="email"
            />
            <Field
              label="Username"
              value={values.username}
              onChange={set("username")}
              error={errors.username}
              placeholder="juma254"
              autoComplete="username"
            />
            <Field
              label="Namba ya simu"
              value={values.phone}
              onChange={set("phone")}
              error={errors.phone}
              placeholder="0712345678"
              type="tel"
              autoComplete="tel"
            />
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Nchi ya Afrika Mashariki</span>
              <select
                value={values.county}
                onChange={setCountry}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              >
                <option value="">Chagua nchi yako</option>
                <option value="Burundi">🇧🇮 Burundi</option>
                <option value="Democratic Republic of the Congo">🇨🇩 DR Congo</option>
                <option value="Kenya">🇰🇪 Kenya</option>
                <option value="Rwanda">🇷🇼 Rwanda</option>
                <option value="Somalia">🇸🇴 Somalia</option>
                <option value="South Sudan">🇸🇸 South Sudan</option>
                <option value="Tanzania">🇹🇿 Tanzania</option>
                <option value="Uganda">🇺🇬 Uganda</option>
              </select>
              {errors.county && (
                <span className="mt-1 block text-xs font-semibold text-destructive">
                  {errors.county}
                </span>
              )}
            </label>
            <Field
              label="Password"
              value={values.password}
              onChange={set("password")}
              error={errors.password}
              type="password"
              autoComplete="new-password"
            />
            <Field
              label="Rudia password"
              value={values.confirmPassword}
              onChange={set("confirmPassword")}
              error={errors.confirmPassword}
              type="password"
              autoComplete="new-password"
            />

            {formError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cta-glow w-full rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Inatuma..." : "✅ Kamilisha Kujisajili"}
            </button>
          </form>

          <Link
            to="/"
            className="mt-3 block rounded-xl border border-border px-4 py-3 text-center font-bold"
          >
            🔙 Rudi Nyumbani
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}

function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
      />
      {error && (
        <span className="mt-1 block text-xs font-semibold text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}
