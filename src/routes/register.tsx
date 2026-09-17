import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteShell } from "@/components/site/site-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Jisajili — BETASHINE ORIGINAL" },
      {
        name: "description",
        content:
          "Jisajili kwenye BetaShine: jaza jina, username, namba ya simu, mkoa na password ili uanze kuchat na wageni na kupata malipo.",
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
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    fullName: z.string().trim().min(3, "Andika jina kamili").max(100),
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
  const [done, setDone] = useState(false);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

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

    const { data: signUp, error } = await supabase.auth.signUp({
      email: `${username}@betashine.app`,
      password: data.password,
      options: { data: { full_name: data.fullName, username } },
    });

    if (error) {
      setLoading(false);
      setFormError(
        /already registered|exists/i.test(error.message)
          ? "Username hii imetumika. Chagua nyingine."
          : "Imeshindikana kujisajili. Jaribu tena.",
      );
      return;
    }

    const userId = signUp.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: data.fullName,
        username,
        phone: data.phone,
        county: data.county,
      });
      if (profileError) {
        setLoading(false);
        setFormError(
          /duplicate|unique/i.test(profileError.message)
            ? "Username au namba ya simu imetumika tayari."
            : "Taarifa zako hazikuhifadhiwa. Jaribu tena.",
        );
        return;
      }
    }

    setLoading(false);
    setValues(EMPTY);
    setDone(true);
  }

  if (done) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl bg-card p-6 text-center shadow-card">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-3 text-2xl font-bold">Umefanikiwa kujisajili!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Taarifa zako zimehifadhiwa salama. Timu yetu itakuwasiliana kwa
              namba uliyoandika ili kuanza mazungumzo yako ya kwanza.
            </p>
            <Link
              to="/"
              className="cta-glow mt-6 block rounded-xl bg-primary px-4 py-3 font-extrabold text-primary-foreground"
            >
              🔙 Rudi Nyumbani
            </Link>
          </div>
        </div>
      </SiteShell>
    );
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
            <Field
              label="County / Mkoa"
              value={values.county}
              onChange={set("county")}
              error={errors.county}
              placeholder="Dar es Salaam"
            />
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
