import { formatBrl } from "@/src/lib/front/format";
import type { DashboardStats } from "@/src/schemas/dashboard";
import { DashEmpty } from "./DashEmpty";
import { DashSectionCollapsible } from "./DashSectionCollapsible";
import { TopProdutosCategoriasSection } from "./sections/TopProdutosCategoriasSection";
import { dashIcons } from "./icons";
import { KpiCard } from "./KpiCard";
import styles from "./NegocioPanel.module.css";
import catStyles from "./CatalogoPanel.module.css";

const fmtInt = new Intl.NumberFormat("pt-BR");

function formatPctShare(part: number, total: number): string {
  if (total <= 0) return "0%";
  const pct = (part / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 1 ? 1 : 0)}%`;
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

type Props = {
  stats: DashboardStats;
};

export function ProdutosPanel({ stats }: Props) {
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
      className={`dashboard-section dashboard-section--produtos ${styles.root}`}
    >
      <DashSectionCollapsible
        sectionIndex={0}
        title="Situação da loja agora"
        description="Posição atual do acervo — não muda com o filtro de período."
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
                    <i
                      className={`${catStyles.mixSwatch} ${s.className}`}
                      aria-hidden
                    />
                    <span>
                      {s.label}{" "}
                      <strong>{fmtInt.format(s.count)}</strong>{" "}
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
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={1}
        title="Vitrine e estrutura"
        description="O que está em evidência na loja e a estrutura de navegação (situação atual)."
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
      </DashSectionCollapsible>

      <TopProdutosCategoriasSection stats={stats} sectionIndex={2} />

      <DashSectionCollapsible
        sectionIndex={3}
        title="Interesse vs venda"
        description="Cliques de WhatsApp em produtos versus unidades vendidas no mesmo período."
      >
        <div className={`${styles.panel} ${styles.panelTable}`}>
          {interestRows.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Interesse (WA)</th>
                  <th>Vendidos</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {interestRows.map((row) => (
                  <tr key={row.produtoId}>
                    <td>
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
      </DashSectionCollapsible>
    </div>
  );
}
