import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/site-context";
import { buildFeed, todayLabel } from "@/data/profiles";
import { USD_RATE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BETASHINE ORIGINAL — Pata mapato kwa kuchat na wageni" },
      {
        name: "description",
        content:
          "BETASHINE ORIGINAL ni jukwaa linalowapa Watanzania fursa ya kupata mapato kwa kuzungumza na wageni. Jisajili, ongana na wageni, na upate TZS 21,000 hadi 33,000 kwa kila mzungu.",
      },
      { property: "og:title", content: "BETASHINE ORIGINAL" },
      {
        property: "og:description",
        content:
          "Jisajili, ongana na wageni, pata TZS 21,000 hadi 33,000 kwa kila mazungumzo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const feed = buildFeed(60);
  const date = todayLabel();

  return (
    <SiteShell>
      <section className="brand-surface px-4 py-6 text-center">
        <p className="text-base font-bold">
          🌍 Foreigners are ready to pay for your time
        </p>
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
