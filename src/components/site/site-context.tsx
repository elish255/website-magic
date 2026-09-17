import { createContext, useContext, useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Ticker } from "./Ticker";
import { Footer } from "./Footer";
import { WithdrawModal } from "./WithdrawModal";
import { ContactModal } from "./ContactModal";
import { SupportFab } from "./SupportFab";

type SiteCtx = {
  openWithdraw: () => void;
  openContact: () => void;
};

const Ctx = createContext<SiteCtx>({ openWithdraw: () => {}, openContact: () => {} });

export const useSite = () => useContext(Ctx);

export function SiteShell({ children }: { children: ReactNode }) {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <Ctx.Provider
      value={{
        openWithdraw: () => setWithdrawOpen(true),
        openContact: () => setContactOpen(true),
      }}
    >
      <div className="flex min-h-screen flex-col">
        <Ticker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <SupportFab />
      {withdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} />}
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </Ctx.Provider>
  );
}
