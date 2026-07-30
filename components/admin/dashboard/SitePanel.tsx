import type { DashboardStats } from "@/src/schemas/dashboard";
import { BarChart, Sparkline } from "./charts";
import { DashEmpty } from "./DashEmpty";
import { DashSectionCollapsible } from "./DashSectionCollapsible";
import { DashTabJumpButton } from "./DashTabJumpButton";
import type { DashboardTabId } from "./dashboardTabs";
import { dashIcons } from "./icons";
import { KpiCard } from "./KpiCard";
import { SimpleBarList } from "./SimpleBarList";
import styles from "./NegocioPanel.module.css";
import usaStyles from "./UsabilidadePanel.module.css";

const fmtInt = new Intl.NumberFormat("pt-BR");
const fmtRatio = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const WA_SOURCE_LABELS: Record<string, string> = {
  home: "Início (destaque)",
  home_strip: "Início (dúvidas)",
  header: "Cabeçalho",
  mobile_nav: "Menu mobile",
  sobre: "Sobre",
  pdp: "Página do produto",
  footer: "Rodapé",
  cart: "Carrinho",
};

const PAGE_PATH_LABELS: Record<string, string> = {
  "/": "Início",
  "/catalogo": "Catálogo",
  "/sobre": "Sobre",
};

const MIX_CLASSES = [
  usaStyles.mix0,
  usaStyles.mix1,
  usaStyles.mix2,
  usaStyles.mix3,
  usaStyles.mix4,
  usaStyles.mix5,
  usaStyles.mix6,
  usaStyles.mix7,
] as const;

function labelForPath(path: string): string {
  const exact = PAGE_PATH_LABELS[path];
  if (exact) return exact;
  if (path.startsWith("/produto/")) return "Produto";
  return "Outra página";
}

function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "0s";
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const h = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin ? `${h}h ${remMin}m` : `${h}h`;
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

function formatPctShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%`;
}

function safeRate(num: number, den: number): number {
  if (den <= 0) return 0;
  return num / den;
}

type MixSegment = {
  key: string;
  label: string;
  count: number;
  className: string;
};

function groupTopPages(
  topPaths: Array<{ path: string; count: number }>,
): MixSegment[] {
  const byLabel = new Map<string, number>();
  for (const p of topPaths) {
    const label = labelForPath(p.path);
    byLabel.set(label, (byLabel.get(label) ?? 0) + p.count);
  }
  return [...byLabel.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .map(({ label, count }, i) => ({
      key: label,
      label,
      count,
      className: MIX_CLASSES[i % MIX_CLASSES.length]!,
    }));
}

type Props = {
  stats: DashboardStats;
  onNavigateTab: (tab: DashboardTabId) => void;
};

export function SitePanel({ stats, onNavigateTab }: Props) {
  const { usabilidade } = stats;
  const sessions = usabilidade.sessions;
  const pageviewsPerSession = safeRate(usabilidade.pageviews, sessions);
  const waPerSession = safeRate(usabilidade.waClicks, sessions);
  const leadPerSession = safeRate(usabilidade.leadsLinked, sessions);
  const waToLead = safeRate(usabilidade.leadsLinked, usabilidade.waClicks);

  const pageviewSpark = usabilidade.daily.map((d) => d.pageviews);
  const waSpark = usabilidade.daily.map((d) => d.waClicks);

  const pageviewSerie = usabilidade.daily.map((d) => ({
    date: d.date,
    pedidos: d.pageviews,
    receita: 0,
  }));
  const sessionSerie = usabilidade.daily.map((d) => ({
    date: d.date,
    pedidos: d.sessions,
    receita: 0,
  }));
  const waSerie = usabilidade.daily.map((d) => ({
    date: d.date,
    pedidos: d.waClicks,
    receita: 0,
  }));

  const hasTraffic =
    usabilidade.pageviews > 0 ||
    usabilidade.sessions > 0 ||
    usabilidade.daily.some((d) => d.pageviews > 0 || d.sessions > 0);
  const hasWa =
    usabilidade.waClicks > 0 || usabilidade.daily.some((d) => d.waClicks > 0);

  const topPages = groupTopPages(usabilidade.topPaths);
  const pagesTotal = topPages.reduce((sum, p) => sum + p.count, 0);

  const waSources: MixSegment[] = usabilidade.waBySource.map((s, i) => ({
    key: s.source,
    label: WA_SOURCE_LABELS[s.source] ?? s.source,
    count: s.count,
    className:
      i === 0 ? usaStyles.mixWa : MIX_CLASSES[i % MIX_CLASSES.length]!,
  }));
  const waSourcesTotal = waSources.reduce((sum, s) => sum + s.count, 0);

  const waProdutoClicks = usabilidade.waTopProdutos.reduce(
    (sum, p) => sum + p.count,
    0,
  );

  return (
    <div
      className={`dashboard-section dashboard-section--site ${styles.root}`}
    >
      <DashSectionCollapsible
        sectionIndex={0}
        title="Visitas e tempo no site"
        description="Comportamento de navegação no período selecionado. Requer aceite de cookies no site público."
        actions={
          hasTraffic ? (
            <Sparkline
              values={pageviewSpark}
              label="Visualizações no período"
              className={styles.spark}
            />
          ) : null
        }
      >
        <div className={styles.heroBand}>
          <KpiCard
            variant="hero"
            icon={dashIcons.pageviews}
            label="Visualizações de página"
            value={fmtInt.format(usabilidade.pageviews)}
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.sessions}
            label="Sessões"
            value={fmtInt.format(usabilidade.sessions)}
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.tempoMedio}
            label="Tempo médio"
            value={formatDuration(usabilidade.avgSessionMs)}
          />
        </div>
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.pageviews}
            label="Páginas por sessão"
            value={fmtRatio.format(pageviewsPerSession)}
          />
          <KpiCard
            icon={dashIcons.duracaoTotal}
            label="Tempo total rastreado"
            value={formatDuration(usabilidade.sessionDurationMs)}
          />
        </div>

        <div className={usaStyles.chartsGrid}>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Visualizações por dia</h4>
            {hasTraffic ? (
              <BarChart
                data={pageviewSerie}
                valueKey="pedidos"
                label="Visualizações por dia"
              />
            ) : (
              <DashEmpty
                title="Sem visualizações"
                text="É necessário o aceite de cookies no site."
              />
            )}
          </div>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Sessões por dia</h4>
            {hasTraffic ? (
              <BarChart
                data={sessionSerie}
                valueKey="pedidos"
                label="Sessões por dia"
              />
            ) : (
              <DashEmpty
                title="Sem sessões"
                text="Sessões aparecem após o aceite de cookies."
              />
            )}
          </div>
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={1}
        title="WhatsApp e contatos"
        description="Cliques no WhatsApp, vínculos de sessão e intensidade por visita."
        actions={
          hasWa ? (
            <Sparkline
              values={waSpark}
              label="Cliques no WhatsApp no período"
              className={styles.spark}
            />
          ) : null
        }
      >
        <div className={styles.heroBand}>
          <KpiCard
            variant="hero"
            icon={dashIcons.whatsapp}
            label="Cliques no WhatsApp"
            value={fmtInt.format(usabilidade.waClicks)}
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.leadLink}
            label="Contatos vinculados"
            value={fmtInt.format(usabilidade.leadsLinked)}
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.waClick}
            label="WA por sessão"
            value={fmtRatio.format(waPerSession)}
          />
        </div>
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.leadLink}
            label="Sessão → contato"
            value={formatPct(leadPerSession)}
          />
          <KpiCard
            icon={dashIcons.ticket}
            label="WA → contato"
            value={formatPct(waToLead)}
          />
        </div>

        <div className={styles.panel}>
          <h4 className={styles.panelTitle}>Cliques no WhatsApp por dia</h4>
          {hasWa ? (
            <BarChart
              data={waSerie}
              valueKey="pedidos"
              label="Cliques no WhatsApp por dia"
            />
          ) : (
            <DashEmpty
              title="Sem cliques no período"
              text="Botões de WhatsApp com rastreio alimentam esta série."
            />
          )}
        </div>
      </DashSectionCollapsible>

      <div className={styles.panel}>
        <h4 className={styles.panelTitle}>Do clique ao pedido</h4>
        <p className={styles.sectionDesc}>
          O funil completo (cliques, contatos e pedidos) está na aba Vendas e
          pedidos, para evitar repetir os mesmos números aqui.
        </p>
        <DashTabJumpButton tab="vendas" onNavigateTab={onNavigateTab}>
          Ver funil em Vendas e pedidos
        </DashTabJumpButton>
      </div>

      <DashSectionCollapsible
        sectionIndex={2}
        title="Onde o tráfego e o WhatsApp acontecem"
        description="Páginas mais vistas e origens dos cliques no WhatsApp no período."
      >
        <div className={usaStyles.mixGrid}>
          <div className={`${styles.panel} ${usaStyles.mixPanel}`}>
            <h4 className={styles.panelTitle}>Páginas mais vistas</h4>
            {topPages.length > 0 ? (
              <>
                <div className={usaStyles.mixVizDesktop}>
                  <div
                    className={usaStyles.mixBar}
                    role="img"
                    aria-label={`Páginas: ${topPages.map((p) => `${p.label} ${p.count}`).join(", ")}`}
                  >
                    {topPages.map((s) => (
                      <div
                        key={s.key}
                        className={`${usaStyles.mixSeg} ${s.className}`}
                        style={{ flexGrow: s.count, flexBasis: 0 }}
                        title={`${s.label}: ${fmtInt.format(s.count)} (${formatPctShare(s.count, pagesTotal)})`}
                      />
                    ))}
                  </div>
                  <ul className={usaStyles.mixLegend}>
                    {topPages.map((s) => (
                      <li key={s.key}>
                        <i
                          className={`${usaStyles.mixSwatch} ${s.className}`}
                          aria-hidden
                        />
                        {s.label}{" "}
                        <strong>{fmtInt.format(s.count)}</strong>{" "}
                        <span className={usaStyles.mixPct}>
                          {formatPctShare(s.count, pagesTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <SimpleBarList
                  items={topPages.map((p) => ({
                    label: p.label,
                    value: p.count,
                  }))}
                  valueLabel="views"
                  ariaLabel="Ranking de páginas mais vistas"
                />
              </>
            ) : (
              <DashEmpty
                title="Sem páginas rastreadas"
                text="É necessário o aceite de cookies no site."
              />
            )}
          </div>

          <div className={`${styles.panel} ${usaStyles.mixPanel}`}>
            <h4 className={styles.panelTitle}>WhatsApp por origem</h4>
            {waSources.length > 0 ? (
              <>
                <div className={usaStyles.mixVizDesktop}>
                  <div
                    className={usaStyles.mixBar}
                    role="img"
                    aria-label={`Origens: ${waSources.map((s) => `${s.label} ${s.count}`).join(", ")}`}
                  >
                    {waSources.map((s) => (
                      <div
                        key={s.key}
                        className={`${usaStyles.mixSeg} ${s.className}`}
                        style={{ flexGrow: s.count, flexBasis: 0 }}
                        title={`${s.label}: ${fmtInt.format(s.count)} (${formatPctShare(s.count, waSourcesTotal)})`}
                      />
                    ))}
                  </div>
                  <ul className={usaStyles.mixLegend}>
                    {waSources.map((s) => (
                      <li key={s.key}>
                        <i
                          className={`${usaStyles.mixSwatch} ${s.className}`}
                          aria-hidden
                        />
                        {s.label}{" "}
                        <strong>{fmtInt.format(s.count)}</strong>{" "}
                        <span className={usaStyles.mixPct}>
                          {formatPctShare(s.count, waSourcesTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <SimpleBarList
                  items={waSources.map((s) => ({
                    label: s.label,
                    value: s.count,
                  }))}
                  valueLabel="cliques"
                  ariaLabel="Ranking de WhatsApp por origem"
                />
              </>
            ) : (
              <DashEmpty
                title="Sem cliques no período"
                text="Origens dos botões de WhatsApp aparecem aqui."
              />
            )}
          </div>
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={3}
        title="Interesse via WhatsApp"
        description="Produtos com mais cliques no botão de WhatsApp da página do produto."
      >
        <div className={styles.panel}>
          {usabilidade.waTopProdutos.length > 0 ? (
            <>
              <p className={usaStyles.rankMeta}>
                {fmtInt.format(waProdutoClicks)} cliques com produto no período
              </p>
              <SimpleBarList
                items={usabilidade.waTopProdutos.map((p) => ({
                  label: p.nome,
                  value: p.count,
                }))}
                valueLabel="cliques"
                ariaLabel="Produtos mais clicados no WhatsApp"
              />
            </>
          ) : (
            <DashEmpty
              title="Sem cliques em produtos"
              text="Cliques no WhatsApp com produto vinculado (página do produto) aparecem neste ranking."
            />
          )}
        </div>
      </DashSectionCollapsible>
    </div>
  );
}
