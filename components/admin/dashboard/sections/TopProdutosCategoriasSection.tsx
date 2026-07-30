import { formatBrl } from "@/src/lib/front/format";
import type { DashboardStats } from "@/src/schemas/dashboard";
import { DashEmpty } from "../DashEmpty";
import { DashSectionCollapsible } from "../DashSectionCollapsible";
import { SimpleBarList } from "../SimpleBarList";
import styles from "../NegocioPanel.module.css";

type Props = {
  stats: DashboardStats;
  sectionIndex: number;
};

export function TopProdutosCategoriasSection({ stats, sectionIndex }: Props) {
  const topProdutos =
    stats.catalogo.topProdutos.length > 0
      ? stats.catalogo.topProdutos
      : stats.negocioTopProdutos;

  return (
    <DashSectionCollapsible
      sectionIndex={sectionIndex}
      title="O que mais vendeu"
      description="Vendas confirmadas no intervalo selecionado no topo do painel."
    >
      <div className={styles.chartGrid}>
        <div className={`${styles.panel} ${styles.panelTable}`}>
          <h4 className={styles.panelTitle}>Top produtos (receita)</h4>
          {topProdutos.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtde</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {topProdutos.map((p) => (
                  <tr key={p.produtoId}>
                    <td>{p.nome}</td>
                    <td>{p.quantidade}</td>
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
          {stats.negocioTopCategorias.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Qtde</th>
                  <th>Receita</th>
                </tr>
              </thead>
              <tbody>
                {stats.negocioTopCategorias.map((c) => (
                  <tr key={c.categoriaId}>
                    <td>{c.nome}</td>
                    <td>{c.quantidade}</td>
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
    </DashSectionCollapsible>
  );
}
