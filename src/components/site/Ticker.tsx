import { useEffect, useState } from "react";

type Notif = { id: number; phone: string; amount: string; time: string };

const COUNTRIES = [
  { currency: "Tsh", min: 50_000, max: 500_000, prefixes: ["076", "075", "078", "068", "071", "065", "062", "073", "077"] },
  { currency: "KES", min: 3_000, max: 20_000, prefixes: ["070", "071", "072", "079", "011", "010"] },
  { currency: "UGX", min: 50_000, max: 500_000, prefixes: ["077", "078", "076", "070", "075", "079"] },
  { currency: "CDF", min: 50_000, max: 500_000, prefixes: ["081", "082", "089", "097", "098", "084", "090"] },
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function makeNotif(id: number): Notif {
  const country = pick(COUNTRIES);
  const prefix = pick(country.prefixes);
  const phone = `${prefix}${Math.floor(Math.random() * 900 + 100)}XXXX`;
  const raw =
    Math.round(
      (country.min + Math.random() * (country.max - country.min)) / 1000,
    ) * 1000;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    id,
    phone,
    amount: `${raw.toLocaleString()}${country.currency}`,
    time,
  };
}

export function Ticker() {
  const [notif, setNotif] = useState<Notif | null>(null);

  useEffect(() => {
    let id = 0;
    const push = () => {
      id += 1;
      setNotif(makeNotif(id));
    };
    push();
    const timer = setInterval(push, 9000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-stretch overflow-hidden bg-brand-deep text-brand-foreground">
      <div className="shrink-0 bg-brand-deep px-3 py-2 text-xs font-extrabold tracking-widest">
        BETASHINE
      </div>
      <div className="relative flex-1 overflow-hidden">
        {notif && (
          <div
            key={notif.id}
            className="ticker-item absolute inset-y-0 flex items-center gap-2 text-sm"
          >
            <span>✅</span>
            <span>
              <strong>{notif.phone}</strong> imetoa{" "}
              <strong>{notif.amount}</strong> muda <strong>{notif.time}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
