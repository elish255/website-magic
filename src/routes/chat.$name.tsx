import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-context";
import { getProfile } from "@/data/profiles";

export const Route = createFileRoute("/chat/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `Chat na ${params.name} — BETASHINE ORIGINAL` },
      {
        name: "description",
        content: `Chat na ${params.name} kwenye BetaShine na upate malipo kwa muda uliopangwa.`,
      },
      { property: "og:title", content: `Chat na ${params.name} — BetaShine` },
      {
        property: "og:description",
        content: `Chat na ${params.name} kwenye BetaShine na upate malipo kwa muda uliopangwa.`,
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { name } = Route.useParams();
  const p = getProfile(name);

  return (
    <SiteShell>
      <div className="border-b border-teal/40 bg-card/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3">
          <Link to="/" className="text-2xl" aria-label="Rudi">
            ←
          </Link>
          <img
            src={p.img}
            alt={p.name}
            className="size-12 rounded-full border-2 border-teal object-cover"
          />
          <div>
            <h2 className="text-lg font-bold">
              {p.name} {p.emoji}
            </h2>
            <p className="text-sm font-semibold text-success">● online</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3 py-5">
        <article className="rounded-2xl bg-card p-5 shadow-card">
          <img
            src={p.img}
            alt={p.name}
            className="size-20 rounded-full border-2 border-teal object-cover"
          />
          <h1 className="mt-4 text-center text-2xl font-bold">
            {p.name} {p.emoji}
          </h1>
          <p className="mx-auto mt-2 w-fit rounded-full bg-secondary px-4 py-1.5 text-sm font-semibold">
            📍 Malipo
          </p>

          <div className="mt-5 rounded-xl border border-border bg-secondary/60 px-4 py-5 text-center">
            <p className="text-sm">📍 Unapata kwa kuchat na {p.name}</p>
            <p className="mt-2 text-3xl font-extrabold text-primary">
              TZS {p.money.toLocaleString()}
            </p>
            <p className="mt-1 text-lg text-muted-foreground">
              Muda: {p.duration} dakika
            </p>
          </div>

          <p className="mt-5 text-center">
            {p.name} anataka: <strong>{p.wants}</strong>
            <br />
            Ukichat naye kwa muda uliopangwa, utalipwa kiasi hicho.
          </p>

          <Link
            to="/register"
            className="cta-glow mt-5 block rounded-xl bg-primary px-4 py-3 text-center font-extrabold text-primary-foreground"
          >
            📝 Jisajili Ili Kuendelea
          </Link>
          <Link
            to="/"
            className="mt-3 block rounded-xl border border-border px-4 py-3 text-center font-bold"
          >
            🔙 Rudi Nyumbani
          </Link>

          <p className="mt-4 text-center text-xs italic text-muted-foreground">
            * Unahitaji kujisajili ili kuendelea na mazungumzo
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
