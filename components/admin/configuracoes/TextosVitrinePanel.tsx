"use client";

import { useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Cookie,
  FileText,
  Footprints,
  Home,
  MapPinned,
  MessageCircle,
  Package,
  ShoppingBag,
  Tags,
  Plus,
  Trash2,
} from "lucide-react";
import { FieldHint } from "@/components/admin/FieldHint";
import type { SiteConfig } from "@/src/schemas/site-config";
import type { SiteDimensao } from "@/src/schemas/site-personalization";
import styles from "./TextosVitrinePanel.module.css";

type CategoryId =
  | "institucional"
  | "paginas"
  | "home"
  | "catalogo"
  | "produto"
  | "rodape"
  | "cookies"
  | "lead"
  | "carrinho"
  | "rotulos";

const CATEGORIES: Array<{
  id: CategoryId;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  fieldCount: number;
}> = [
  {
    id: "institucional",
    label: "Sobre e Trocas",
    shortLabel: "Sobre",
    description: "Apresentação e política de trocas na página Sobre.",
    icon: FileText,
    fieldCount: 2,
  },
  {
    id: "paginas",
    label: "Páginas",
    shortLabel: "Páginas",
    description: "Títulos de páginas, Sobre e tela “não encontrada”.",
    icon: FileText,
    fieldCount: 12,
  },
  {
    id: "home",
    label: "Home",
    shortLabel: "Home",
    description: "Seções da home, botões do banner e dúvidas.",
    icon: Home,
    fieldCount: 9,
  },
  {
    id: "catalogo",
    label: "Catálogo",
    shortLabel: "Catálogo",
    description: "Busca, filtros, contagem e sem resultados.",
    icon: Package,
    fieldCount: 6,
  },
  {
    id: "produto",
    label: "Produto",
    shortLabel: "Produto",
    description: "Selos, botões e avisos de estoque/variação.",
    icon: Tags,
    fieldCount: 12,
  },
  {
    id: "rodape",
    label: "Rodapé",
    shortLabel: "Rodapé",
    description: "Colunas e rótulos de contato no rodapé.",
    icon: Footprints,
    fieldCount: 7,
  },
  {
    id: "cookies",
    label: "Cookies",
    shortLabel: "Cookies",
    description: "Aviso de cookies no rodapé da loja.",
    icon: Cookie,
    fieldCount: 3,
  },
  {
    id: "lead",
    label: "WhatsApp",
    shortLabel: "Lead",
    description: "Janela de contato antes do WhatsApp (se ativo).",
    icon: MessageCircle,
    fieldCount: 9,
  },
  {
    id: "carrinho",
    label: "Carrinho",
    shortLabel: "Carrinho",
    description: "Título, vazio, avisos e botão de envio.",
    icon: ShoppingBag,
    fieldCount: 8,
  },
  {
    id: "rotulos",
    label: "Rótulos",
    shortLabel: "Rótulos",
    description: "Menu de categorias e nomes de variação.",
    icon: Tags,
    fieldCount: 0,
  },
];

function display(value: string, fallback = "…") {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function TextField({
  label,
  where,
  hint,
  value,
  disabled,
  onChange,
  rows = 1,
  placeholder,
  required = true,
}: {
  label: string;
  where: string;
  hint?: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const Tag = rows > 1 ? "textarea" : "input";
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? (
          <span className={styles.required} aria-hidden>
            *
          </span>
        ) : null}
        {hint ? <FieldHint text={hint} /> : null}
      </span>
      <span className={styles.where}>
        <span className={styles.whereMark} aria-hidden>
          <MapPinned size={12} strokeWidth={2} />
        </span>
        {where}
      </span>
      <Tag
        className={rows > 1 ? "textarea" : "input"}
        rows={rows > 1 ? rows : undefined}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PreviewShell({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  const body = (
    <>
      <p className={styles.previewLabel}>{label}</p>
      <div className={styles.previewStage}>{children}</div>
      {note ? <p className={styles.previewNote}>{note}</p> : null}
    </>
  );

  return (
    <div className={styles.previewSlot}>
      <details className={styles.previewMobile}>
        <summary className={styles.previewMobileSummary}>Ver prévia</summary>
        <div className={styles.previewMobileBody}>{body}</div>
      </details>
      <aside className={styles.preview} aria-live="polite">
        {body}
      </aside>
    </div>
  );
}

function MockBrowser({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.mockBrowser}>
      <div className={styles.mockChrome} aria-hidden>
        <span className={styles.mockDot} />
        <span className={styles.mockDot} />
        <span className={styles.mockDot} />
        <span className={styles.mockUrl}>{url}</span>
      </div>
      {children}
    </div>
  );
}

function InstitucionalPreview({
  sobre,
  trocas,
  nomeLoja,
}: {
  sobre: string;
  trocas: string;
  nomeLoja: string;
}) {
  return (
    <PreviewShell
      label="Pré-visualização — Sobre e Trocas"
      note="Ilustrativo. Os textos aparecem juntos com endereço, horários e contatos cadastrados na aba Contato e Endereço."
    >
      <MockBrowser url="/sobre">
        <div className={styles.mockBody}>
          <h3 className={styles.mockPageTitle}>
            Sobre a {nomeLoja || "sua loja"}
          </h3>
          <p className={styles.mockPageLead}>
            {display(sobre, "Apresente sua loja aqui.")}
          </p>
          <div className={styles.mockSection}>
            <h4 className={styles.mockSectionTitle}>Trocas</h4>
            <p className={styles.mockPageLead}>
              {display(trocas, "Informe aqui sua política de trocas.")}
            </p>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function PaginasPreview({
  t,
  nomeLoja,
}: {
  t: SiteConfig["textos"]["paginas"];
  nomeLoja: string;
}) {
  return (
    <PreviewShell
      label="Pré-visualização — Páginas"
      note="Ilustrativo. O título Sobre na vitrine pode aparecer como “Sobre a Nome da loja”."
    >
      <MockBrowser url="/sobre">
        <div className={styles.mockBody}>
          <h3 className={styles.mockPageTitle}>
            {display(t.sobreTituloPrefixo)} {nomeLoja || "sua loja"}
          </h3>
          <p className={styles.mockPageLead}>
            Menu e rodapé usam “{display(t.sobreTitulo)}”. Catálogo e carrinho
            usam “{display(t.catalogoTitulo)}” e “{display(t.carrinhoTitulo)}”.
          </p>
          <div className={styles.mockList}>
            <div className={styles.mockListItem}>
              <span className={styles.mockListLabel}>
                {display(t.sobreLabelLocal)}
              </span>
              <span className={styles.mockListValue}>Rua Exemplo, 100</span>
            </div>
            <div className={styles.mockListItem}>
              <span className={styles.mockListLabel}>
                {display(t.sobreLabelHorarios)}
              </span>
              <span className={styles.mockListValue}>Seg–Sex 9h–18h</span>
            </div>
            <div className={styles.mockListItem}>
              <span className={styles.mockListLabel}>
                {display(t.sobreLabelTrocas)}
              </span>
              <span className={styles.mockListValue}>Política resumida…</span>
            </div>
          </div>
          <button type="button" className={styles.btnWa} tabIndex={-1}>
            {display(t.sobreCtaWhatsapp)}
          </button>
        </div>
      </MockBrowser>
      <MockBrowser url="/pagina-inexistente">
        <div className={styles.mockBody}>
          <h3 className={styles.mockPageTitle}>{display(t.notFoundTitulo)}</h3>
          <p className={styles.mockPageLead}>{display(t.notFoundTexto)}</p>
          <div className={styles.mockActions}>
            <button type="button" className={styles.btnPrimary} tabIndex={-1}>
              {display(t.notFoundCtaInicio)}
            </button>
            <button type="button" className={styles.btnGhost} tabIndex={-1}>
              {display(t.notFoundCtaCatalogo)}
            </button>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function HomePreview({ t }: { t: SiteConfig["textos"]["home"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Home"
      note="Ilustrativo. “Ver tudo” aparece com mais destaque em alguns layouts."
    >
      <MockBrowser url="/">
        <div className={styles.mockBody}>
          <div className={styles.mockHero}>
            <p className={styles.mockHeroTitle}>Bem-vindo à loja</p>
            <div className={styles.mockHeroActions}>
              <button type="button" className={styles.btnPrimary} tabIndex={-1}>
                {display(t.verColecao)}
              </button>
              <button type="button" className={styles.btnWa} tabIndex={-1}>
                {display(t.whatsappCurto)}
              </button>
            </div>
          </div>
          <div className={styles.mockSection}>
            <div className={styles.mockSectionHead}>
              <h3 className={styles.mockSectionTitle}>
                {display(t.destaquesTitulo)}
              </h3>
              <span className={styles.mockLink}>{display(t.verTudo)}</span>
            </div>
            <div className={styles.mockCards}>
              <div className={styles.mockCard} />
              <div className={styles.mockCard} />
            </div>
          </div>
          <div className={styles.mockSection}>
            <h3 className={styles.mockSectionTitle}>
              {display(t.lancamentosTitulo)}
            </h3>
            <p className={styles.mockPageLead}>
              Se não houver destaques/lançamentos, a loja pode usar “
              {display(t.fallbackTitulo)}”.
            </p>
          </div>
          <div className={styles.mockSection}>
            <h3 className={styles.mockSectionTitle}>
              {display(t.duvidasTitulo)}
            </h3>
            <p className={styles.mockPageLead}>{display(t.duvidasTexto)}</p>
            <button type="button" className={styles.btnWa} tabIndex={-1}>
              {display(t.whatsappChamar)}
            </button>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function CatalogoPreview({ t }: { t: SiteConfig["textos"]["catalogo"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Catálogo"
      note="Ilustrativo. A contagem usa singular/plural conforme o número de produtos."
    >
      <MockBrowser url="/catalogo">
        <div className={styles.mockBody}>
          <div className={styles.mockSearch}>{display(t.buscaPlaceholder)}</div>
          <div className={styles.mockFilter}>
            {display(t.labelCategoria)} · 12 {display(t.contagemPlural)}
          </div>
          <div className={styles.mockCards}>
            <div className={styles.mockCard} />
            <div className={styles.mockCard} />
          </div>
          <div className={styles.mockEmpty}>
            <p className={styles.mockEmptyTitle}>{display(t.empty)}</p>
            <button type="button" className={styles.btnGhost} tabIndex={-1}>
              {display(t.limparFiltros)}
            </button>
            <p className={styles.mockPageLead}>
              Ex.: “1 {display(t.contagemSingular)}” ou “12{" "}
              {display(t.contagemPlural)}”.
            </p>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function ProdutoPreview({
  t,
  dimensoes,
}: {
  t: SiteConfig["textos"]["produto"];
  dimensoes: SiteDimensao[];
}) {
  const dimLabel =
    dimensoes.map((d) => d.rotulo).filter(Boolean).join(" e ") ||
    "tamanho e cor";
  return (
    <PreviewShell
      label="Pré-visualização — Produto"
      note="Ilustrativo. Selos aparecem nos cards; botões e estoque na página do produto."
    >
      <MockBrowser url="/produto/exemplo">
        <div className={styles.mockBody}>
          <div className={styles.mockCards}>
            <div className={styles.mockCard}>
              <span className={styles.mockBadge}>{display(t.badgeNovo)}</span>
              <span className={styles.mockCardMeta}>
                {display(t.aPartirDe)}R$ 89,90
              </span>
            </div>
            <div className={styles.mockCard}>
              <span className={[styles.mockBadge, styles.mockBadgeSold].join(" ")}>
                {display(t.badgeEsgotado)}
              </span>
              <span className={styles.mockCardMeta}>Indisponível</span>
            </div>
          </div>
          <div className={styles.mockPdp}>
            <div className={styles.mockPdpMedia} />
            <h3 className={styles.mockPdpTitle}>Produto exemplo</h3>
            <p className={styles.mockPrice}>
              {display(t.aPartirDe)}R$ 89,90
            </p>
            <div className={styles.mockVariant}>
              {dimLabel}
              <div className={styles.mockSwatches}>
                <span className={styles.mockSwatch} />
                <span className={styles.mockSwatch} />
                <span className={styles.mockSwatch} />
              </div>
            </div>
            <p className={styles.mockStock}>{display(t.estoqueSelecione)}</p>
            <p className={styles.mockStock}>{display(t.estoqueUm)}</p>
            <p className={styles.mockStock}>
              {display(t.estoqueVarios).replace("{n}", "3")}
            </p>
            <div className={styles.mockActions}>
              <button type="button" className={styles.btnPrimary} tabIndex={-1}>
                {display(t.ctaCarrinho)}
              </button>
              <button type="button" className={styles.btnWa} tabIndex={-1}>
                {display(t.ctaInteresse)}
              </button>
            </div>
            <p className={styles.mockPageLead}>
              Se faltar variação: “{display(t.selecioneVariante)}”. No WhatsApp:
              “{display(t.waSelecioneVariante)}” / “{display(t.waEsgotado)}”.
            </p>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function RodapePreview({ t }: { t: SiteConfig["textos"]["rodape"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Rodapé"
      note="Ilustrativo. Os títulos organizam as colunas no rodapé de todas as páginas."
    >
      <div className={styles.mockFooter}>
        <div className={styles.mockFooterCols}>
          <div>
            <p className={styles.mockFooterColTitle}>{display(t.tituloLoja)}</p>
            <p className={styles.mockFooterItem}>Nome da loja</p>
          </div>
          <div>
            <p className={styles.mockFooterColTitle}>{display(t.tituloRedes)}</p>
            <p className={styles.mockFooterItem}>Instagram</p>
          </div>
          <div>
            <p className={styles.mockFooterColTitle}>{display(t.tituloLinks)}</p>
            <p className={styles.mockFooterItem}>Catálogo · Sobre</p>
          </div>
          <div>
            <p className={styles.mockFooterColTitle}>
              {display(t.tituloContato)}
            </p>
            <p className={styles.mockFooterItem}>
              {display(t.labelEndereco)} · {display(t.labelHorarios)} ·{" "}
              {display(t.labelTelefone)}
            </p>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}

function CookiesPreview({ t }: { t: SiteConfig["textos"]["cookies"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Cookies"
      note="Ilustrativo. O aviso aparece até o visitante aceitar ou recusar."
    >
      <div className={styles.mockCookie}>
        <p className={styles.mockCookieText}>{display(t.mensagem)}</p>
        <div className={styles.mockCookieActions}>
          <button type="button" className={styles.btnPrimary} tabIndex={-1}>
            {display(t.aceitar)}
          </button>
          <button type="button" className={styles.btnGhost} tabIndex={-1}>
            {display(t.recusar)}
          </button>
        </div>
      </div>
    </PreviewShell>
  );
}

function LeadPreview({ t }: { t: SiteConfig["textos"]["leadModal"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Captação WhatsApp"
      note="Ilustrativo. Só aparece se a coleta de lead estiver ligada na aba WhatsApp."
    >
      <div className={styles.mockModal}>
        <p className={styles.mockEyebrow}>{display(t.eyebrow)}</p>
        <h3 className={styles.mockModalTitle}>{display(t.titulo)}</h3>
        <p className={styles.mockModalDesc}>{display(t.descricao)}</p>
        <div className={styles.mockFieldMini}>
          <span className={styles.mockFieldMiniLabel}>{display(t.labelNome)}</span>
          <span className={styles.mockFieldMiniInput}>
            {display(t.placeholderNome)}
          </span>
        </div>
        <div className={styles.mockFieldMini}>
          <span className={styles.mockFieldMiniLabel}>
            {display(t.labelCelular)}
          </span>
          <span className={styles.mockFieldMiniInput}>
            {display(t.placeholderCelular)}
          </span>
        </div>
        <div className={styles.mockFieldMini}>
          <span className={styles.mockFieldMiniLabel}>
            {display(t.labelEmail)}
          </span>
          <span className={styles.mockFieldMiniInput}>
            {display(t.placeholderEmail)}
          </span>
        </div>
        <button type="button" className={styles.btnWa} tabIndex={-1}>
          {display(t.submit)}
        </button>
      </div>
    </PreviewShell>
  );
}

function CarrinhoPreview({ t }: { t: SiteConfig["textos"]["carrinho"] }) {
  return (
    <PreviewShell
      label="Pré-visualização — Carrinho"
      note="Ilustrativo. O título da página do carrinho é este (não o da aba Páginas)."
    >
      <MockBrowser url="/carrinho">
        <div className={styles.mockBody}>
          <div className={styles.mockCart}>
            <h3 className={styles.mockCartTitle}>{display(t.titulo)}</h3>
            <div className={styles.mockCartEmpty}>
              <p className={styles.mockCartEmptyTitle}>
                {display(t.emptyTitulo)}
              </p>
              <p className={styles.mockCartEmptyLead}>{display(t.emptyLead)}</p>
              <div className={styles.mockActions}>
                <button type="button" className={styles.btnPrimary} tabIndex={-1}>
                  {display(t.verCatalogo)}
                </button>
                <button type="button" className={styles.btnGhost} tabIndex={-1}>
                  {display(t.voltarHome)}
                </button>
              </div>
            </div>
            <div className={styles.mockCartFilled}>
              <div className={styles.mockCartLine}>
                <span className={styles.mockCartThumb} />
                <p className={styles.mockCartLineTitle}>Produto exemplo × 1</p>
              </div>
              <p className={styles.mockWarn}>{display(t.limiteWa)}</p>
              <div className={styles.mockActions}>
                <button type="button" className={styles.btnWa} tabIndex={-1}>
                  {display(t.enviarWhatsapp)}
                </button>
                <button type="button" className={styles.btnGhost} tabIndex={-1}>
                  {display(t.esvaziar)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </MockBrowser>
    </PreviewShell>
  );
}

function RotulosPreview({
  navCategorias,
  dimensoes,
}: {
  navCategorias: string;
  dimensoes: SiteDimensao[];
}) {
  return (
    <PreviewShell
      label="Pré-visualização — Rótulos"
      note="Ilustrativo. Os nomes das variações aparecem na página do produto."
    >
      <div className={styles.mockBody} style={{ padding: 0 }}>
        <span className={styles.mockNavLabel}>
          <Tags size={14} strokeWidth={2} aria-hidden />
          {display(navCategorias)}
        </span>
        <div className={styles.mockList}>
          {dimensoes.map((d) => (
            <div key={d.id} className={styles.mockListItem}>
              <span className={styles.mockListLabel}>{display(d.rotulo)}</span>
              <span className={styles.mockListValue}>
                Opções do produto (ex.: P, M, G)
              </span>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function slugifyDimId(raw: string): string {
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (/^[a-z][a-z0-9_]*$/i.test(base)) return base;
  return `opcao_${Date.now().toString(36).slice(-4)}`;
}

export function TextosVitrinePanel({
  formId,
  config,
  disabled,
  onSubmit,
  onConfigChange,
}: {
  formId: string;
  config: SiteConfig;
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
}) {
  const t = config.textos;
  const navId = useId();
  const [category, setCategory] = useState<CategoryId>("institucional");
  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const ActiveIcon = active.icon;

  function patchTextos(partial: Partial<SiteConfig["textos"]>) {
    onConfigChange({ ...config, textos: { ...t, ...partial } });
  }

  function patchRotulos(partial: Partial<SiteConfig["rotulos"]>) {
    onConfigChange({
      ...config,
      rotulos: { ...config.rotulos, ...partial },
    });
  }

  function updateDimensao(index: number, next: SiteDimensao) {
    const dimensoes = config.rotulos.dimensoes.map((d, i) =>
      i === index ? next : d,
    );
    patchRotulos({ dimensoes });
  }

  function removeDimensao(index: number) {
    if (config.rotulos.dimensoes.length <= 1) return;
    patchRotulos({
      dimensoes: config.rotulos.dimensoes.filter((_, i) => i !== index),
    });
  }

  function addDimensao() {
    if (config.rotulos.dimensoes.length >= 4) return;
    const used = new Set(config.rotulos.dimensoes.map((d) => d.id));
    let n = config.rotulos.dimensoes.length + 1;
    let id = `opcao_${n}`;
    while (used.has(id)) {
      n += 1;
      id = `opcao_${n}`;
    }
    patchRotulos({
      dimensoes: [
        ...config.rotulos.dimensoes,
        { id, rotulo: `Opção ${n}` },
      ],
    });
  }

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={[
        "admin-form",
        "admin-form--sections",
        styles.shell,
        disabled ? "admin-form--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={disabled || undefined}
    >
      <div className={styles.intro}>
        <h2 className={styles.introTitle}>Textos da vitrine</h2>
        <p className={styles.introText}>
          Edite os textos por área. Vale depois de salvar.
        </p>
      </div>

      <div
        className={styles.nav}
        role="tablist"
        aria-label="Áreas de texto da vitrine"
        id={navId}
      >
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const count =
            c.id === "rotulos"
              ? 1 + config.rotulos.dimensoes.length
              : c.fieldCount;
          const selected = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                styles.navBtn,
                selected ? styles.navBtnActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => setCategory(c.id)}
            >
              <Icon size={15} strokeWidth={2} aria-hidden />
              <span>{c.shortLabel}</span>
              <span className={styles.navCount}>{count}</span>
            </button>
          );
        })}
      </div>

      <section className={styles.panel} role="tabpanel" aria-labelledby={navId}>
        <header className={styles.panelHeader}>
          <span className={styles.panelIcon} aria-hidden>
            <ActiveIcon size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className={styles.panelTitle}>{active.label}</h2>
            <p className={styles.panelDesc}>{active.description}</p>
          </div>
        </header>

        <div className={styles.panelBody}>
          <div className={styles.fields}>
            {category === "institucional" ? (
              <div className={styles.fieldGroup}>
                <p className={styles.fieldGroupTitle}>
                  Conteúdo da página Sobre
                </p>
                <TextField
                  label="Apresentação da loja"
                  where="Texto principal no início da página Sobre"
                  hint="Conte a história, o propósito e o diferencial da sua loja."
                  value={t.sobre}
                  disabled={disabled}
                  rows={6}
                  required={false}
                  onChange={(v) => patchTextos({ sobre: v })}
                />
                <TextField
                  label="Política de trocas"
                  where="Seção Trocas da página Sobre"
                  hint="Explique de forma simples como o cliente deve solicitar troca ou devolução."
                  value={t.trocas}
                  disabled={disabled}
                  rows={6}
                  required={false}
                  onChange={(v) => patchTextos({ trocas: v })}
                />
              </div>
            ) : null}

            {category === "paginas" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Títulos no menu e páginas</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Título do catálogo"
                      where="Título da página Catálogo, SEO e link no rodapé"
                      value={t.paginas.catalogoTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, catalogoTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Título Sobre"
                      where="Nome da página Sobre no menu/rodapé e SEO"
                      hint="O título grande na página pode usar o prefixo abaixo + nome da loja."
                      value={t.paginas.sobreTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Título Carrinho (menu)"
                      where="Nome “Carrinho” em links/navegação da loja"
                      hint="O título dentro da página do carrinho é outro campo, na área Carrinho."
                      value={t.paginas.carrinhoTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, carrinhoTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Prefixo do título Sobre"
                      where="Antes do nome da loja no título grande de /sobre"
                      value={t.paginas.sobreTituloPrefixo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreTituloPrefixo: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Página Sobre</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Rótulo Local"
                      where="Etiqueta do endereço na página Sobre"
                      value={t.paginas.sobreLabelLocal}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreLabelLocal: v },
                        })
                      }
                    />
                    <TextField
                      label="Rótulo Horários"
                      where="Etiqueta dos horários na página Sobre"
                      value={t.paginas.sobreLabelHorarios}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreLabelHorarios: v },
                        })
                      }
                    />
                    <TextField
                      label="Rótulo Trocas"
                      where="Etiqueta da política de trocas na página Sobre"
                      value={t.paginas.sobreLabelTrocas}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreLabelTrocas: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão WhatsApp (Sobre)"
                      where="Botão de contato no final da página Sobre"
                      value={t.paginas.sobreCtaWhatsapp}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, sobreCtaWhatsapp: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Página não encontrada</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Título"
                      where="Título da tela quando a página não existe"
                      value={t.paginas.notFoundTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, notFoundTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Texto explicativo"
                      where="Mensagem abaixo do título na tela 404"
                      value={t.paginas.notFoundTexto}
                      disabled={disabled}
                      rows={2}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, notFoundTexto: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão início"
                      where="Botão que leva de volta à home"
                      value={t.paginas.notFoundCtaInicio}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, notFoundCtaInicio: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão catálogo"
                      where="Botão que leva ao catálogo"
                      value={t.paginas.notFoundCtaCatalogo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          paginas: { ...t.paginas, notFoundCtaCatalogo: v },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {category === "home" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Seções de produtos</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Título Destaques"
                      where="Título da seção de produtos em destaque na home"
                      value={t.home.destaquesTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          home: { ...t.home, destaquesTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Título Lançamentos"
                      where="Título da seção de novidades na home"
                      value={t.home.lancamentosTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          home: { ...t.home, lancamentosTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Título reserva"
                      where="Usado quando não há destaques/lançamentos para mostrar"
                      hint="Aparece como título genérico da grade de produtos."
                      value={t.home.fallbackTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          home: { ...t.home, fallbackTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Link “ver tudo”"
                      where="Link junto das seções (em alguns layouts)"
                      value={t.home.verTudo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, verTudo: v } })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Banner e dúvidas</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Botão do banner"
                      where="Botão principal do banner da home (vai ao catálogo)"
                      value={t.home.verColecao}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, verColecao: v } })
                      }
                    />
                    <TextField
                      label="Botão WhatsApp curto"
                      where="Botão curto de WhatsApp no banner / produto"
                      value={t.home.whatsappCurto}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, whatsappCurto: v } })
                      }
                    />
                    <TextField
                      label="Título Dúvidas"
                      where="Título do bloco final “fale conosco” na home"
                      value={t.home.duvidasTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, duvidasTitulo: v } })
                      }
                    />
                    <TextField
                      label="Texto Dúvidas"
                      where="Texto de apoio abaixo do título de dúvidas"
                      value={t.home.duvidasTexto}
                      disabled={disabled}
                      rows={2}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, duvidasTexto: v } })
                      }
                    />
                    <TextField
                      label="Botão WhatsApp (dúvidas)"
                      where="Botão do bloco de dúvidas na home"
                      value={t.home.whatsappChamar}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({ home: { ...t.home, whatsappChamar: v } })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {category === "catalogo" ? (
              <div className={styles.fieldGroup}>
                <p className={styles.fieldGroupTitle}>Busca e resultados</p>
                <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                  <TextField
                    label="Texto da busca"
                    where="Placeholder do campo de busca no catálogo e no cabeçalho"
                    value={t.catalogo.buscaPlaceholder}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        catalogo: { ...t.catalogo, buscaPlaceholder: v },
                      })
                    }
                  />
                  <TextField
                    label="Rótulo Categoria"
                    where="Nome do filtro de categorias no catálogo"
                    value={t.catalogo.labelCategoria}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        catalogo: { ...t.catalogo, labelCategoria: v },
                      })
                    }
                  />
                  <TextField
                    label="Contagem (1 item)"
                    where="Palavra usada com 1 produto, ex.: “1 produto”"
                    value={t.catalogo.contagemSingular}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        catalogo: { ...t.catalogo, contagemSingular: v },
                      })
                    }
                  />
                  <TextField
                    label="Contagem (vários)"
                    where="Palavra usada com vários produtos, ex.: “12 produtos”"
                    value={t.catalogo.contagemPlural}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        catalogo: { ...t.catalogo, contagemPlural: v },
                      })
                    }
                  />
                  <TextField
                    label="Nenhum resultado"
                    where="Mensagem quando a busca/filtro não acha produtos"
                    value={t.catalogo.empty}
                    disabled={disabled}
                    rows={2}
                    onChange={(v) =>
                      patchTextos({ catalogo: { ...t.catalogo, empty: v } })
                    }
                  />
                  <TextField
                    label="Limpar filtros"
                    where="Botão para resetar busca e filtros no catálogo"
                    value={t.catalogo.limparFiltros}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        catalogo: { ...t.catalogo, limparFiltros: v },
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {category === "produto" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Cards e botões</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Selo Novo"
                      where="Etiqueta nos cards de produtos novos"
                      value={t.produto.badgeNovo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, badgeNovo: v },
                        })
                      }
                    />
                    <TextField
                      label="Selo Esgotado"
                      where="Etiqueta nos cards sem estoque"
                      value={t.produto.badgeEsgotado}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, badgeEsgotado: v },
                        })
                      }
                    />
                    <TextField
                      label="“A partir de”"
                      where="Antes do preço nos cards (quando há faixa de preço)"
                      value={t.produto.aPartirDe}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, aPartirDe: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão adicionar ao carrinho"
                      where="Botão principal na página do produto"
                      value={t.produto.ctaCarrinho}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, ctaCarrinho: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão WhatsApp (interesse)"
                      where="Botão para falar no WhatsApp sobre o produto"
                      value={t.produto.ctaInteresse}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, ctaInteresse: v },
                        })
                      }
                    />
                    <TextField
                      label="Escolha a variação"
                      where="Aviso quando o cliente ainda não escolheu tamanho/cor"
                      value={t.produto.selecioneVariante}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, selecioneVariante: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Estoque e WhatsApp</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Estoque: selecione"
                      where="Status de estoque antes de escolher a variação"
                      value={t.produto.estoqueSelecione}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, estoqueSelecione: v },
                        })
                      }
                    />
                    <TextField
                      label="Estoque: indisponível"
                      where="Quando a combinação escolhida não existe"
                      value={t.produto.estoqueIndisponivel}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, estoqueIndisponivel: v },
                        })
                      }
                    />
                    <TextField
                      label="Estoque: 1 unidade"
                      where="Quando resta exatamente 1 unidade"
                      value={t.produto.estoqueUm}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, estoqueUm: v },
                        })
                      }
                    />
                    <TextField
                      label="Estoque: várias unidades"
                      where="Use {n} no lugar do número, ex.: “{n} disponíveis”"
                      hint="O sistema substitui {n} pela quantidade."
                      value={t.produto.estoqueVarios}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, estoqueVarios: v },
                        })
                      }
                    />
                    <TextField
                      label="WhatsApp: escolha a variação"
                      where="Aviso ao tentar WhatsApp sem escolher variação"
                      value={t.produto.waSelecioneVariante}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, waSelecioneVariante: v },
                        })
                      }
                    />
                    <TextField
                      label="WhatsApp: esgotado"
                      where="Aviso ao tentar WhatsApp com produto esgotado"
                      value={t.produto.waEsgotado}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          produto: { ...t.produto, waEsgotado: v },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {category === "rodape" ? (
              <div className={styles.fieldGroup}>
                <p className={styles.fieldGroupTitle}>Colunas e contato</p>
                <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                  <TextField
                    label="Coluna Loja"
                    where="Título da coluna com dados da loja no rodapé"
                    value={t.rodape.tituloLoja}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({ rodape: { ...t.rodape, tituloLoja: v } })
                    }
                  />
                  <TextField
                    label="Coluna Redes"
                    where="Título da coluna de redes sociais no rodapé"
                    value={t.rodape.tituloRedes}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({ rodape: { ...t.rodape, tituloRedes: v } })
                    }
                  />
                  <TextField
                    label="Coluna Links"
                    where="Título da coluna de links úteis no rodapé"
                    value={t.rodape.tituloLinks}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({ rodape: { ...t.rodape, tituloLinks: v } })
                    }
                  />
                  <TextField
                    label="Coluna Contato"
                    where="Título da coluna de contato no rodapé"
                    value={t.rodape.tituloContato}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        rodape: { ...t.rodape, tituloContato: v },
                      })
                    }
                  />
                  <TextField
                    label="Rótulo Endereço"
                    where="Etiqueta do endereço no rodapé"
                    value={t.rodape.labelEndereco}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        rodape: { ...t.rodape, labelEndereco: v },
                      })
                    }
                  />
                  <TextField
                    label="Rótulo Horários"
                    where="Etiqueta dos horários no rodapé"
                    value={t.rodape.labelHorarios}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        rodape: { ...t.rodape, labelHorarios: v },
                      })
                    }
                  />
                  <TextField
                    label="Rótulo Telefone"
                    where="Etiqueta do telefone no rodapé"
                    value={t.rodape.labelTelefone}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({
                        rodape: { ...t.rodape, labelTelefone: v },
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {category === "cookies" ? (
              <div className={styles.fieldGroup}>
                <p className={styles.fieldGroupTitle}>Aviso de cookies</p>
                <TextField
                  label="Mensagem"
                  where="Texto do banner de cookies na parte de baixo da loja"
                  value={t.cookies.mensagem}
                  disabled={disabled}
                  rows={3}
                  onChange={(v) =>
                    patchTextos({ cookies: { ...t.cookies, mensagem: v } })
                  }
                />
                <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                  <TextField
                    label="Botão Aceitar"
                    where="Botão para aceitar cookies"
                    value={t.cookies.aceitar}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({ cookies: { ...t.cookies, aceitar: v } })
                    }
                  />
                  <TextField
                    label="Botão Recusar"
                    where="Botão para recusar cookies"
                    value={t.cookies.recusar}
                    disabled={disabled}
                    onChange={(v) =>
                      patchTextos({ cookies: { ...t.cookies, recusar: v } })
                    }
                  />
                </div>
              </div>
            ) : null}

            {category === "lead" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Cabeçalho da janela</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Etiqueta superior"
                      where="Texto pequeno acima do título (ex.: WhatsApp)"
                      value={t.leadModal.eyebrow}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, eyebrow: v },
                        })
                      }
                    />
                    <TextField
                      label="Título"
                      where="Título principal da janela de captação"
                      value={t.leadModal.titulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, titulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Descrição"
                      where="Texto de apoio abaixo do título"
                      value={t.leadModal.descricao}
                      disabled={disabled}
                      rows={2}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, descricao: v },
                        })
                      }
                    />
                    <TextField
                      label="Botão continuar"
                      where="Botão que envia os dados e abre o WhatsApp"
                      value={t.leadModal.submit}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, submit: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Campos do formulário</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Rótulo Nome"
                      where="Nome do campo de nome na janela"
                      value={t.leadModal.labelNome}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, labelNome: v },
                        })
                      }
                    />
                    <TextField
                      label="Exemplo Nome"
                      where="Texto cinza dentro do campo de nome"
                      value={t.leadModal.placeholderNome}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, placeholderNome: v },
                        })
                      }
                    />
                    <TextField
                      label="Rótulo Celular"
                      where="Nome do campo de celular"
                      value={t.leadModal.labelCelular}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, labelCelular: v },
                        })
                      }
                    />
                    <TextField
                      label="Exemplo Celular"
                      where="Texto cinza dentro do campo de celular"
                      value={t.leadModal.placeholderCelular}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, placeholderCelular: v },
                        })
                      }
                    />
                    <TextField
                      label="Rótulo E-mail"
                      where="Nome do campo de e-mail"
                      value={t.leadModal.labelEmail}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, labelEmail: v },
                        })
                      }
                    />
                    <TextField
                      label="Exemplo E-mail"
                      where="Texto cinza dentro do campo de e-mail"
                      value={t.leadModal.placeholderEmail}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          leadModal: { ...t.leadModal, placeholderEmail: v },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {category === "carrinho" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Página e estado vazio</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Título da página"
                      where="Título grande dentro da página do carrinho"
                      hint="Diferente do título de menu na área Páginas."
                      value={t.carrinho.titulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, titulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Título do carrinho vazio"
                      where="Quando não há itens no carrinho"
                      value={t.carrinho.emptyTitulo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, emptyTitulo: v },
                        })
                      }
                    />
                    <TextField
                      label="Texto do carrinho vazio"
                      where="Explicação abaixo do título quando está vazio"
                      value={t.carrinho.emptyLead}
                      disabled={disabled}
                      rows={3}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, emptyLead: v },
                        })
                      }
                    />
                    <TextField
                      label="Ver catálogo"
                      where="Botão para ir ao catálogo com carrinho vazio"
                      value={t.carrinho.verCatalogo}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, verCatalogo: v },
                        })
                      }
                    />
                    <TextField
                      label="Voltar à home"
                      where="Botão para voltar à página inicial"
                      value={t.carrinho.voltarHome}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, voltarHome: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Com itens no carrinho</p>
                  <div className={`${styles.fieldRow} ${styles.fieldRow2}`}>
                    <TextField
                      label="Enviar no WhatsApp"
                      where="Botão principal para enviar o pedido"
                      value={t.carrinho.enviarWhatsapp}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, enviarWhatsapp: v },
                        })
                      }
                    />
                    <TextField
                      label="Esvaziar carrinho"
                      where="Botão para remover todos os itens"
                      value={t.carrinho.esvaziar}
                      disabled={disabled}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, esvaziar: v },
                        })
                      }
                    />
                    <TextField
                      label="Aviso mensagem longa"
                      where="Alerta quando o pedido fica grande demais para o WhatsApp"
                      value={t.carrinho.limiteWa}
                      disabled={disabled}
                      rows={3}
                      onChange={(v) =>
                        patchTextos({
                          carrinho: { ...t.carrinho, limiteWa: v },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {category === "rotulos" ? (
              <>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Navegação</p>
                  <TextField
                    label="Menu Categorias"
                    where="Nome do menu/dropdown de categorias no cabeçalho"
                    value={config.rotulos.navCategorias}
                    disabled={disabled}
                    onChange={(v) => patchRotulos({ navCategorias: v })}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>Variações do produto</p>
                  <p className={styles.where}>
                    Nomes exibidos na página do produto (ex.: Tamanho, Cor). De 1
                    a 4 opções.
                  </p>
                  <div className={styles.dimList}>
                    {config.rotulos.dimensoes.map((d, index) => (
                      <div key={`${d.id}-${index}`} className={styles.dimRow}>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            Identificador interno
                            <FieldHint text="Usado pelo sistema. Prefira letras minúsculas sem espaço (ex.: tamanho)." />
                          </span>
                          <input
                            className="input"
                            value={d.id}
                            disabled={disabled}
                            required
                            aria-required="true"
                            onChange={(e) => {
                              const nextId = slugifyDimId(e.target.value) || d.id;
                              updateDimensao(index, { ...d, id: nextId });
                            }}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>
                            Nome visível
                            <span className={styles.required} aria-hidden>
                              *
                            </span>
                          </span>
                          <span className={styles.where}>
                            O que o cliente lê na página do produto
                          </span>
                          <input
                            className="input"
                            value={d.rotulo}
                            disabled={disabled}
                            required
                            aria-required="true"
                            onChange={(e) =>
                              updateDimensao(index, {
                                ...d,
                                rotulo: e.target.value,
                              })
                            }
                          />
                        </label>
                        <div className={styles.dimActions}>
                          <button
                            type="button"
                            className={`${styles.dimBtn} ${styles.dimBtnDanger}`}
                            disabled={
                              disabled || config.rotulos.dimensoes.length <= 1
                            }
                            onClick={() => removeDimensao(index)}
                            aria-label={`Remover ${d.rotulo || "opção"}`}
                          >
                            <Trash2 size={14} strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.dimBtn}
                    disabled={disabled || config.rotulos.dimensoes.length >= 4}
                    onClick={addDimensao}
                  >
                    <Plus size={14} strokeWidth={2} aria-hidden />
                    Adicionar opção
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {category === "institucional" ? (
            <InstitucionalPreview
              sobre={t.sobre}
              trocas={t.trocas}
              nomeLoja={config.nomeLoja}
            />
          ) : null}
          {category === "paginas" ? (
            <PaginasPreview t={t.paginas} nomeLoja={config.nomeLoja} />
          ) : null}
          {category === "home" ? <HomePreview t={t.home} /> : null}
          {category === "catalogo" ? <CatalogoPreview t={t.catalogo} /> : null}
          {category === "produto" ? (
            <ProdutoPreview t={t.produto} dimensoes={config.rotulos.dimensoes} />
          ) : null}
          {category === "rodape" ? <RodapePreview t={t.rodape} /> : null}
          {category === "cookies" ? <CookiesPreview t={t.cookies} /> : null}
          {category === "lead" ? <LeadPreview t={t.leadModal} /> : null}
          {category === "carrinho" ? <CarrinhoPreview t={t.carrinho} /> : null}
          {category === "rotulos" ? (
            <RotulosPreview
              navCategorias={config.rotulos.navCategorias}
              dimensoes={config.rotulos.dimensoes}
            />
          ) : null}
        </div>
      </section>
    </form>
  );
}
