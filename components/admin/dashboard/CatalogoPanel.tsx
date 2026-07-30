import { formatBrl } from "@/src/lib/front/format";
import type { DashboardStats } from "@/src/schemas/dashboard";
import { DashEmpty } from "./DashEmpty";
import { DashSection } from "./DashSection";
import { KpiCard } from "./KpiCard";
import { SimpleBarList } from "./SimpleBarList";
import { dashIcons } from "./icons";
import styles from "./NegocioPanel.module.css";
import catStyles from "./CatalogoPanel.module.css";

const fmtInt = new Intl.NumberFormat("pt-BR");

function formatPctShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%`;
}

type Props = {
  stats: DashboardStats;
};

export function CatalogoPanel({ stats }: Props) {
  const { catalogo } = stats;
  const total = catalogo.produtos;
  const hasSales = catalogo.topProdutos.length > 0;
  const hasInterest = stats.usabilidade.waTopProdutos.length > 0;

  const statusSegments = [
    {
      key: "ativos",
      label: "Ativos",
      count: catalogo.ativos,
      className: catStyles.mixAtivos,
    },
    {
      key: "ocultos",
      label: "Ocultos",
      count: catalogo.ocultos,
      className: catStyles.mixOcultos,
    },
    {
      key: "esgotados",
      label: "Esgotados",
      count: catalogo.esgotados,
      className: catStyles.mixEsgotados,
    },
  ].filter((s) => s.count > 0);

  const soldById = new Map(
    catalogo.topProdutos.map((p) => [p.produtoId, p]),
  );
  const interestRows = buildInterestRows(
    stats.usabilidade.waTopProdutos,
    soldById,
    catalogo.topProdutos,
  );

  return (
    <div
      className={`dashboard-section dashboard-section--catalogo ${styles.root}`}
    >
      <DashSection
        title="Saúde do catálogo"
        description="Posição atual do acervo (independente do período selecionado)."
      >
        <div className={styles.heroBand}>
          <KpiCard
            variant="hero"
            icon={dashIcons.produtos}
            label="Produtos"
            value={fmtInt.format(catalogo.produtos)}
            href="/admin/produtos"
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.ativos}
            label="Ativos"
            value={fmtInt.format(catalogo.ativos)}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.esgotados}
            label="Esgotados"
            value={fmtInt.format(catalogo.esgotados)}
            href="/admin/produtos"
          />
        </div>

        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.ocultos}
            label="Ocultos"
            value={fmtInt.format(catalogo.ocultos)}
          />
          <KpiCard
            icon={dashIcons.estoque}
            label="Unidades em estoque"
            value={fmtInt.format(catalogo.unidadesEstoque)}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.semEstoque}
            label="Produtos sem estoque"
            value={fmtInt.format(catalogo.produtosEstoqueZero)}
            href="/admin/produtos"
          />
        </div>

        <div className={`${styles.panel} ${catStyles.mixPanel}`}>
          <h4 className={styles.panelTitle}>Mix de status</h4>
          {total > 0 ? (
            <>
              <div
                className={catStyles.mixBar}
                role="img"
                aria-label={`Mix: ${catalogo.ativos} ativos, ${catalogo.ocultos} ocultos, ${catalogo.esgotados} esgotados`}
              >
                {statusSegments.map((s) => (
                  <div
                    key={s.key}
                    className={`${catStyles.mixSeg} ${s.className}`}
                    style={{ flexGrow: s.count, flexBasis: 0 }}
                    title={`${s.label}: ${fmtInt.format(s.count)} (${formatPctShare(s.count, total)})`}
                  />
                ))}
              </div>
              <ul className={catStyles.mixLegend}>
                {statusSegments.map((s) => (
                  <li key={s.key}>
                    <i className={`${catStyles.mixSwatch} ${s.className}`} aria-hidden />
                    <span>
                      {s.label}{" "}
                      <strong>
                        {fmtInt.format(s.count)}
                      </strong>{" "}
                      <span className={catStyles.mixPct}>
                        ({formatPctShare(s.count, total)})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <DashEmpty title="Nenhum produto cadastrado" />
          )}
        </div>
      </DashSection>

      <DashSection
        title="Vitrine e estrutura"
        description="O que está em evidência na loja e a estrutura de navegação."
      >
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.destaque}
            label="Destaques"
            value={fmtInt.format(catalogo.destaques)}
            href="/admin/produtos"
          />
          <KpiCard
            icon={dashIcons.lancamento}
            label="Lançamentos"
            value={fmtInt.format(catalogo.lancamentos)}
            href="/admin/produtos"
          />
          <KpiCard
            icon={dashIcons.promocao}
            label="Em promoção"
            value={fmtInt.format(catalogo.comPromocao)}
            href="/admin/produtos"
          />
          <KpiCard
            variant={catalogo.semCapa > 0 ? "caution" : "compact"}
            icon={dashIcons.semCapa}
            label="Sem capa"
            value={fmtInt.format(catalogo.semCapa)}
            href="/admin/produtos"
          />
          <KpiCard
            icon={dashIcons.categorias}
            label="Categorias ativas"
            value={`${fmtInt.format(catalogo.categoriasAtivas)} / ${fmtInt.format(catalogo.categorias)}`}
            href="/admin/categorias"
          />
          <KpiCard
            icon={dashIcons.banners}
            label="Banners ativos"
            value={fmtInt.format(catalogo.bannersAtivos)}
            href="/admin/personalizacao?tab=vitrine"
          />
        </div>
      </DashSection>

      <DashSection
        title="Performance no período"
        description="Vendas confirmadas no intervalo selecionado no topo do painel."
      >
        <div className={styles.chartGrid}>
          <div className={`${styles.panel} ${styles.panelTable}`}>
            <h4 className={styles.panelTitle}>Mais vendidos</h4>
            {hasSales ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.topProdutos.map((p) => (
                    <tr key={p.produtoId}>
                      <td className={styles.tablePrimaryCell} title={p.nome}>
                        {p.nome}
                      </td>
                      <td>{fmtInt.format(p.quantidade)}</td>
                      <td>{formatBrl(p.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DashEmpty
                title="Sem vendas no período"
                text="Ajuste o período ou registre pedidos confirmados."
              />
            )}
          </div>
          <div className={`${styles.panel} ${styles.panelTable}`}>
            <h4 className={styles.panelTitle}>Top categorias</h4>
            {stats.negocioTopCategorias.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.negocioTopCategorias.map((c) => (
                    <tr key={c.categoriaId}>
                      <td className={styles.tablePrimaryCell} title={c.nome}>
                        {c.nome}
                      </td>
                      <td>{fmtInt.format(c.quantidade)}</td>
                      <td>{formatBrl(c.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DashEmpty title="Sem vendas no período" />
            )}
          </div>
        </div>

        <div className={styles.chartGrid}>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Mix de tamanhos</h4>
            {stats.negocioMix.tamanhos.length > 0 ? (
              <SimpleBarList
                items={stats.negocioMix.tamanhos.map((t) => ({
                  label: t.label,
                  value: t.quantidade,
                }))}
                valueLabel="un."
                ariaLabel="Unidades vendidas por tamanho"
              />
            ) : (
              <DashEmpty title="Sem dados de mix" />
            )}
          </div>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Mix de cores</h4>
            {stats.negocioMix.cores.length > 0 ? (
              <SimpleBarList
                items={stats.negocioMix.cores.map((c) => ({
                  label: c.label,
                  value: c.quantidade,
                }))}
                valueLabel="un."
                ariaLabel="Unidades vendidas por cor"
              />
            ) : (
              <DashEmpty title="Sem dados de mix" />
            )}
          </div>
        </div>
      </DashSection>

      <DashSection
        title="Interesse vs venda"
        description="Cliques de WhatsApp em produtos versus unidades vendidas no mesmo período."
      >
        <div className={`${styles.panel} ${styles.panelTable}`}>
          {interestRows.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Interesse (WhatsApp)</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {interestRows.map((row) => (
                  <tr key={row.produtoId}>
                    <td
                      className={styles.tablePrimaryCell}
                      title={row.nome}
                    >
                      {row.nome}
                      {row.interestOnly ? (
                        <span className={catStyles.interestHint}>
                          {" "}
                          · interesse sem venda
                        </span>
                      ) : null}
                    </td>
                    <td>{fmtInt.format(row.waClicks)}</td>
                    <td>
                      {row.quantidade > 0
                        ? fmtInt.format(row.quantidade)
                        : "—"}
                    </td>
                    <td>
                      {row.receita > 0 ? formatBrl(row.receita) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : hasInterest || hasSales ? (
            <DashEmpty title="Sem cruzamento no período" />
          ) : (
            <DashEmpty
              title="Sem interesse ou vendas"
              text="Não há cliques de WhatsApp em produtos nem vendas neste intervalo."
            />
          )}
        </div>
      </DashSection>
    </div>
  );
}

type SoldRef = {
  produtoId: string;
  nome: string;
  quantidade: number;
  receita: number;
};

type InterestRow = {
  produtoId: string;
  nome: string;
  waClicks: number;
  quantidade: number;
  receita: number;
  interestOnly: boolean;
};

function buildInterestRows(
  waTop: Array<{ produtoId: string; nome: string; count: number }>,
  soldById: Map<string, SoldRef>,
  topSold: SoldRef[],
): InterestRow[] {
  const seen = new Set<string>();
  const rows: InterestRow[] = [];

  for (const wa of waTop) {
    seen.add(wa.produtoId);
    const sold = soldById.get(wa.produtoId);
    rows.push({
      produtoId: wa.produtoId,
      nome: wa.nome,
      waClicks: wa.count,
      quantidade: sold?.quantidade ?? 0,
      receita: sold?.receita ?? 0,
      interestOnly: !sold,
    });
  }

  // Include top sellers that had no WA interest in the period (for contrast).
  for (const sold of topSold.slice(0, 3)) {
    if (seen.has(sold.produtoId)) continue;
    rows.push({
      produtoId: sold.produtoId,
      nome: sold.nome,
      waClicks: 0,
      quantidade: sold.quantidade,
      receita: sold.receita,
      interestOnly: false,
    });
  }

  return rows;
}
