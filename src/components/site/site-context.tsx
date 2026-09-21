import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Ticker } from "./Ticker";
import { Footer } from "./Footer";
import { WithdrawModal } from "./WithdrawModal";

type SiteCtx = {
  openWithdraw: () => void;
};

const Ctx = createContext<SiteCtx>({ openWithdraw: () => {} });

export const useSite = () => useContext(Ctx);

export function SiteShell({ children }: { children: ReactNode }) {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  useEffect(() => { const open = () => setWithdrawOpen(true); window.addEventListener("betashine:open-withdraw", open); return () => window.removeEventListener("betashine:open-withdraw", open); }, []);

  return (
    <Ctx.Provider value={{ openWithdraw: () => setWithdrawOpen(true) }}>
      <div className="flex min-h-screen flex-col">
        <Ticker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
    </Ctx.Provider>
  );
}
