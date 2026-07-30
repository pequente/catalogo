import Link from "next/link";
import { formatBrl } from "@/src/lib/front/format";
import type { DashboardStats } from "@/src/schemas/dashboard";
import { BarChart, Sparkline } from "./charts";
import { DashEmpty } from "./DashEmpty";
import { DashSectionCollapsible } from "./DashSectionCollapsible";
import { DashTabJumpButton } from "./DashTabJumpButton";
import type { DashboardTabId } from "./dashboardTabs";
import { DashIcon, dashIcons } from "./icons";
import { KpiCard } from "./KpiCard";
import styles from "./NegocioPanel.module.css";
import cliStyles from "./ClientesPanel.module.css";

const fmtInt = new Intl.NumberFormat("pt-BR");

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

function formatPctShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%`;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type Props = {
  stats: DashboardStats;
  onNavigateTab: (tab: DashboardTabId) => void;
};

export function ClientesPanel({ stats, onNavigateTab }: Props) {
  const { clientes } = stats;
  const comPedidoBase = Math.max(0, clientes.total - clientes.nuncaCompraram);
  const hasCadastros = clientes.novos > 0;
  const hasTop = clientes.topPorReceita.length > 0;

  const cadastroSerie = clientes.serieCadastros.map((d) => ({
    date: d.date,
    pedidos: d.count,
    receita: 0,
  }));
  const cadastroSpark = clientes.serieCadastros.map((d) => d.count);

  const pedidoSegments = [
    {
      key: "com",
      label: "Com pedido",
      count: comPedidoBase,
      className: cliStyles.mixComPedido,
    },
    {
      key: "sem",
      label: "Sem pedido",
      count: clientes.nuncaCompraram,
      className: cliStyles.mixSemPedido,
    },
  ].filter((s) => s.count > 0);

  const contatoSegments = [
    {
      key: "soCelular",
      label: "Só WhatsApp",
      count: clientes.contato.soCelular,
      className: cliStyles.mixCelular,
    },
    {
      key: "soEmail",
      label: "Só e-mail",
      count: clientes.contato.soEmail,
      className: cliStyles.mixEmail,
    },
    {
      key: "ambos",
      label: "Ambos",
      count: clientes.contato.comAmbos,
      className: cliStyles.mixAmbos,
    },
  ].filter((s) => s.count > 0);

  const contatoTotal =
    clientes.contato.soCelular +
    clientes.contato.soEmail +
    clientes.contato.comAmbos;

  return (
    <div
      className={`dashboard-section dashboard-section--clientes ${styles.root}`}
    >
      <DashSectionCollapsible
        sectionIndex={0}
        title="Visão geral de clientes"
        description="Totais da base e cadastros no período selecionado. Conversão de novos considera qualquer pedido confirmado, não só no intervalo."
        actions={
          hasCadastros ? (
            <Sparkline
              values={cadastroSpark}
              label="Cadastros no período"
              className={styles.spark}
            />
          ) : null
        }
      >
        <div className={styles.heroBand}>
          <KpiCard
            variant="hero"
            icon={dashIcons.clientes}
            label="Total de clientes"
            value={fmtInt.format(clientes.total)}
            href="/admin/clientes"
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.clienteNovo}
            label="Novos no período"
            value={fmtInt.format(clientes.novos)}
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.ticket}
            label="Conversão novos → pedido"
            value={formatPct(clientes.taxaConversaoNovos)}
          />
        </div>
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.pedidos}
            label="Novos com pedido"
            value={fmtInt.format(clientes.novosComPedido)}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.clienteSemPedido}
            label="Novos sem pedido"
            value={fmtInt.format(clientes.novosSemPedido)}
          />
          <KpiCard
            icon={dashIcons.recorrente}
            label="Recorrentes no período"
            value={fmtInt.format(clientes.recorrentes)}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.clienteSemPedido}
            label="Nunca compraram"
            value={fmtInt.format(clientes.nuncaCompraram)}
            href="/admin/clientes"
          />
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={1}
        title="Qualidade da base"
        description="Distribuição all-time da base e canais de contato cadastrados."
      >
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.pedidos}
            label="Pedidos com cliente"
            value={fmtInt.format(clientes.atribuicao.pedidosComCliente)}
          />
          <KpiCard
            icon={dashIcons.cancelados}
            label="Pedidos sem cliente"
            value={fmtInt.format(clientes.atribuicao.pedidosSemCliente)}
          />
          <KpiCard
            icon={dashIcons.celular}
            label="Com WhatsApp"
            value={fmtInt.format(clientes.contato.comCelular)}
          />
          <KpiCard
            icon={dashIcons.email}
            label="Com e-mail"
            value={fmtInt.format(clientes.contato.comEmail)}
          />
        </div>

        <div className={cliStyles.mixGrid}>
          <div className={`${styles.panel} ${cliStyles.mixPanel}`}>
            <h4 className={styles.panelTitle}>Compras na base</h4>
            {clientes.total > 0 ? (
              <>
                <div
                  className={cliStyles.mixBar}
                  role="img"
                  aria-label={`Mix: ${comPedidoBase} com pedido, ${clientes.nuncaCompraram} sem pedido`}
                >
                  {pedidoSegments.map((s) => (
                    <div
                      key={s.key}
                      className={`${cliStyles.mixSeg} ${s.className}`}
                      style={{ flexGrow: s.count }}
                    />
                  ))}
                </div>
                <ul className={cliStyles.mixLegend}>
                  {pedidoSegments.map((s) => (
                    <li key={s.key}>
                      <i
                        className={`${cliStyles.mixSwatch} ${s.className}`}
                        aria-hidden
                      />
                      {s.label}{" "}
                      <strong>{fmtInt.format(s.count)}</strong>{" "}
                      <span className={cliStyles.mixPct}>
                        {formatPctShare(s.count, clientes.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <DashEmpty title="Sem clientes cadastrados" />
            )}
          </div>

          <div className={`${styles.panel} ${cliStyles.mixPanel}`}>
            <h4 className={styles.panelTitle}>Canais de contato</h4>
            {clientes.total > 0 ? (
              <>
                <div
                  className={cliStyles.mixBar}
                  role="img"
                  aria-label={`Contato: ${clientes.contato.soCelular} só WhatsApp, ${clientes.contato.soEmail} só e-mail, ${clientes.contato.comAmbos} ambos`}
                >
                  {contatoSegments.map((s) => (
                    <div
                      key={s.key}
                      className={`${cliStyles.mixSeg} ${s.className}`}
                      style={{ flexGrow: s.count }}
                    />
                  ))}
                </div>
                <ul className={cliStyles.mixLegend}>
                  {contatoSegments.map((s) => (
                    <li key={s.key}>
                      <i
                        className={`${cliStyles.mixSwatch} ${s.className}`}
                        aria-hidden
                      />
                      {s.label}{" "}
                      <strong>{fmtInt.format(s.count)}</strong>{" "}
                      <span className={cliStyles.mixPct}>
                        {formatPctShare(s.count, contatoTotal || clientes.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <DashEmpty title="Sem contatos" />
            )}
          </div>
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={2}
        title="Cadastros no período"
        description="Volume diário de novos clientes no intervalo selecionado."
      >
        <div className={styles.panel}>
          <h4 className={styles.panelTitle}>Cadastros por dia</h4>
          {hasCadastros ? (
            <BarChart
              data={cadastroSerie}
              valueKey="pedidos"
              label="Cadastros por dia"
            />
          ) : (
            <DashEmpty
              title="Sem cadastros no período"
              text="Ajuste o intervalo ou aguarde novos leads."
            />
          )}
        </div>
      </DashSectionCollapsible>

      <div className={styles.panel}>
        <h4 className={styles.panelTitle}>Cliques e contatos</h4>
        <p className={styles.sectionDesc}>
          O funil do período (WhatsApp → contato → pedido) está nas abas Vendas
          e pedidos e Site e WhatsApp.
        </p>
        <div className={styles.sectionActions}>
          <DashTabJumpButton tab="vendas" onNavigateTab={onNavigateTab}>
            Ver funil em Vendas
          </DashTabJumpButton>
          <DashTabJumpButton tab="site" onNavigateTab={onNavigateTab}>
            Ver cliques no Site
          </DashTabJumpButton>
        </div>
      </div>

      <DashSectionCollapsible
        sectionIndex={3}
        title="Top clientes por receita"
        description="Receita de pedidos confirmados no período, atribuídos a um cliente."
      >
        <div className={`${styles.panel} ${styles.panelTable}`}>
          {hasTop ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Pedidos</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {clientes.topPorReceita.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.tablePrimaryCell} title={c.nome}>
                      <Link
                        className={cliStyles.nameLink}
                        href="/admin/clientes"
                      >
                        {c.nome}
                      </Link>
                    </td>
                    <td>{fmtInt.format(c.pedidos)}</td>
                    <td>{formatBrl(c.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <DashEmpty
              title="Sem vendas atribuídas"
              text="Pedidos confirmados com cliente no período aparecem neste ranking."
            />
          )}
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={4}
        title="Novos no período"
        description="Últimos cadastros do intervalo, com canal de contato e histórico de pedidos."
        actions={
          <Link className={`btn btn-ghost btn-sm ${styles.exportBtn}`} href="/admin/clientes">
            <DashIcon icon={dashIcons.clientes} />
            Ver todos
          </Link>
        }
      >
        {clientes.recentes.length > 0 ? (
          <div className={`${styles.panel} ${styles.panelTable}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Cadastro</th>
                  <th>Pedido</th>
                </tr>
              </thead>
              <tbody>
                {clientes.recentes.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.tablePrimaryCell} title={c.nome}>
                      <Link
                        className={cliStyles.nameLink}
                        href="/admin/clientes"
                      >
                        {c.nome}
                      </Link>
                    </td>
                    <td>
                      <span className={cliStyles.badgeRow}>
                        {c.temCelular ? (
                          <span
                            className={`${cliStyles.badge} ${cliStyles.badgeWa}`}
                            title="WhatsApp"
                          >
                            <DashIcon icon={dashIcons.celular} />
                          </span>
                        ) : null}
                        {c.temEmail ? (
                          <span
                            className={`${cliStyles.badge} ${cliStyles.badgeMail}`}
                            title="E-mail"
                          >
                            <DashIcon icon={dashIcons.email} />
                          </span>
                        ) : null}
                        {!c.temCelular && !c.temEmail ? (
                          <span className={cliStyles.muted}>—</span>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <span className={cliStyles.muted}>
                        {formatDateTime(c.criadoEm)}
                      </span>
                    </td>
                    <td>
                      {c.temPedido ? (
                        <span className={`${cliStyles.chip} ${cliStyles.chipYes}`}>
                          Sim
                          {c.pedidosCount > 0
                            ? ` · ${fmtInt.format(c.pedidosCount)}`
                            : ""}
                        </span>
                      ) : (
                        <span className={`${cliStyles.chip} ${cliStyles.chipNo}`}>
                          Não
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashEmpty
            title="Sem clientes novos no período"
            text="Cadastros com data de criação neste intervalo aparecerão aqui."
          />
        )}
      </DashSectionCollapsible>
    </div>
  );
}
