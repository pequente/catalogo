"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getClientLead,
  setClientLead,
  withClientGreeting,
  type ClientLead,
} from "@/src/lib/front/client-lead";
import { ClientLeadModal } from "@/components/public/ClientLeadModal";
import { useAnalyticsOptional } from "@/components/public/analytics/AnalyticsProvider";
import type { SiteTextosExtended } from "@/src/schemas/site-personalization";

type WhatsAppGateContextValue = {
  requestWhatsApp: (href: string) => void;
};

const WhatsAppGateContext = createContext<WhatsAppGateContextValue | null>(
  null,
);

function openWhatsApp(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function WhatsAppGateProvider({
  children,
  coletarLead = true,
  leadCopy,
}: {
  children: ReactNode;
  coletarLead?: boolean;
  leadCopy: SiteTextosExtended["leadModal"];
}) {
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const analytics = useAnalyticsOptional();

  const requestWhatsApp = useCallback(
    (href: string) => {
      if (!coletarLead) {
        openWhatsApp(href);
        return;
      }
      const lead = getClientLead();
      if (lead) {
        openWhatsApp(withClientGreeting(href, lead.nome));
        return;
      }
      setPendingHref(href);
    },
    [coletarLead],
  );

  const close = useCallback(() => setPendingHref(null), []);

  const complete = useCallback(
    (lead: ClientLead) => {
      setClientLead(lead);
      const href = pendingHref;
      setPendingHref(null);
      void fetch("/api/v1/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: lead.nome,
          email: lead.email,
          celular: lead.celular,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json().catch(() => null)) as {
            id?: string;
            nome?: string;
            email?: string;
            celular?: string;
          } | null;
          if (data?.id) {
            setClientLead({
              id: data.id,
              nome: data.nome ?? lead.nome,
              email: data.email ?? lead.email,
              celular: data.celular ?? lead.celular,
            });
            analytics?.linkClient(data.id);
          }
        })
        .catch(() => {
          /* ignore — local lead already saved */
        });

      if (href) {
        openWhatsApp(withClientGreeting(href, lead.nome));
      }
    },
    [pendingHref, analytics],
  );

  const value = useMemo(() => ({ requestWhatsApp }), [requestWhatsApp]);

  return (
    <WhatsAppGateContext.Provider value={value}>
      {children}
      {pendingHref ? (
        <ClientLeadModal copy={leadCopy} onClose={close} onComplete={complete} />
      ) : null}
    </WhatsAppGateContext.Provider>
  );
}

export function useWhatsAppGate() {
  const ctx = useContext(WhatsAppGateContext);
  if (!ctx) {
    throw new Error("useWhatsAppGate must be used within WhatsAppGateProvider");
  }
  return ctx;
}
