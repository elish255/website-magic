import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-context";
import { buildFeed, todayLabel } from "@/data/profiles";
import { SITE_URL, SEO_KEYWORDS, USD_RATE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BETASHINE — Betashine Org | Connect, Learn, Earn" },
      { name: "description", content: "BETASHINE (Betashine Org) ni jukwaa la Connect, Learn, Earn. Chat na foreigners, shiriki Kiswahili na utamaduni, na pata mapato kwa muda wako." },
      { name: "keywords", content: SEO_KEYWORDS },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "BETASHINE — Betashine Org" },
      { property: "og:description", content: "Connect, Learn, Earn. Chat na foreigners na pata mapato." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: `${SITE_URL}/betashine-logo.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BETASHINE — Betashine Org" },
      { name: "twitter:description", content: "Connect, Learn, Earn." },
      { name: "twitter:image", content: `${SITE_URL}/betashine-logo.jpg` },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Home,
});

function Home() {
  const feed = buildFeed(60);
  const date = todayLabel();

  return (
    <SiteShell>
      <section className="brand-surface px-4 py-7 text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">BETASHINE</h1>
        <p className="mt-1 text-sm font-bold text-teal">Betashine Org · Connect, Learn, Earn.</p>
        <p className="mt-3 text-base font-bold">🌍 Foreigners are ready to pay for your time</p>
        <p className="mt-2 text-2xl font-extrabold text-teal">
          make atleast TZS 50,000 up to TZS 100,000 per day
        </p>
      </section>

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-5">
        {feed.map((p) => (
          <article
            key={p.name}
            className="rounded-2xl bg-card p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="size-16 rounded-full border-2 border-teal object-cover"
              />
              <div className="flex-1">
                <h3 className="text-lg font-bold">
                  {p.name} {p.emoji}
                </h3>
                <p className="text-sm font-semibold text-success">● online</p>
                <p className="text-sm font-bold text-accent-foreground">
                  ★ {p.rating}
                </p>
              </div>
              <div className="text-right">
                <span className="grid size-8 place-items-center rounded-full bg-secondary text-sm text-success">
                  ✓
                </span>
                <p className="mt-1 text-xs text-muted-foreground">{date}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="font-extrabold">CHAT TIME :</span>{" "}
                {p.duration} minutes
              </p>
              <p>
                <span className="font-extrabold">WANTS :</span>{" "}
                <span className="text-muted-foreground">{p.wants}</span>
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <Link
                to="/chat/$name"
                params={{ name: p.name }}
                className="cta-glow rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-primary-foreground"
              >
                💬 START CHAT
              </Link>
              <div className="text-right">
                <span className="block rounded-lg bg-brand px-3 py-1.5 text-sm font-extrabold text-brand-foreground">
                  TZS {p.money.toLocaleString()}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Earn USD {(p.money / USD_RATE).toFixed(2)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SiteShell>
  );
}
