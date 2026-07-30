# Personalização da vitrine (referência)

Configuração canônica: arquivos em `data/configuracoes/` segmentados por aba do admin (schema composto `SiteConfig` em `src/schemas/site-config.ts`; fatias em `src/schemas/site-config-tabs.ts`).

| Arquivo | Aba / conteúdo |
|---------|----------------|
| `meta.json` | `versao`, `atualizadoEm` |
| `geral.json` | marca, cores, logo, meta de receita do dashboard |
| `whatsapp.json` | templates WA + `comportamento` |
| `contato.json` | Instagram, endereço, telefones, horários, `textos.sobre`/`trocas` |
| `vitrine.json` | `layout` + limites `vitrine` |
| `navegacao.json` | `navegacao` |
| `textos.json` | restante de `textos.*` + `rotulos` |
| `tema.json` | `tema`, `seo` |

A migration `2026-07-split-site-config-by-tab` converte o legado `site.json` monolítico nesses fragmentos. A migration `2026-07-merge-geral-config-tab` une os legados `identidade.json` + `painel.json` em `geral.json`.

Fragments são a fonte canônica quando `meta.json` + abas existem. O monolito `site.json` só é lido se os fragmentos ainda não tiverem sido migrados. Qualquer save bem-sucedido no admin **remove** `site.json` residual no mesmo commit.

Locks otimistas usam `meta.versao` (compartilhado entre abas). Conflitos de tip do GitHub (`REF_CONFLICT`) são distintos de `VERSION_CONFLICT` e têm retry automático.

## Frescor na vitrine pública

Após salvar no admin, `revalidateStorefront("site-config", …)` invalida a Data Cache (`getCachedSiteConfig`, tag `site-config`) e o Full Route Cache de `/`, `/catalogo`, `/sobre`, `/carrinho`, `/produto` (layout) e ícones. A vitrine deve refletir a mudança na próxima request — sem redeploy. O TTL de 120s (`STOREFRONT_REVALIDATE_SECONDS`) é só rede de segurança se a invalidação on-demand falhar.

Checklist rápido pós-save:

- Geral (nome/cores/logo/meta) → header/footer/CSS vars em `/` e progresso no Painel
- WhatsApp → CTA home, header, PDP
- Contato / textos sobre → `/sobre`
- `mostrarCarrinho` → `/carrinho` (404 se desligado)
- Vitrine/layout → home + catálogo

## Matriz resumida (campo → superfície)

| Campo JSON | Onde aparece | Desktop / mobile |
|------------|--------------|------------------|
| `nomeLoja`, `assinatura`, `slogan`, `logo` | Header, footer, hero, metadata | Responsivo (CSS layout) |
| `cores.*`, `tema.*` | `--vn-*` em `app/layout.tsx` | Mesmas vars |
| `layout` | `data-layout` + `layout-tokens.css` | Grids 2→3→4 em `globals.css` @768/@1024 |
| `textos.home.*` | `*Home.tsx` (classic, split, gallery) | Idem |
| `textos.paginas.*` | Títulos de página, 404, sobre | Idem |
| `textos.catalogo.*` | `CatalogPageView`, `headerNav` busca | Filtros: sheet mobile / painel desktop |
| `textos.produto.*` | `ProductCard`, `ProductDetailClient`, `ProductVariantPicker` | Idem |
| `textos.carrinho.*` | `CartPageClient` | Idem |
| `textos.rodape.*`, `comportamento.rodapeUsarNavegacao` | `PublicFooterSections`, `footerContact` | Idem |
| `textos.cookies.*` | `ConsentBanner` | Fixo rodapé viewport |
| `textos.leadModal.*` | `ClientLeadModal` | Modal full-screen mobile |
| `comportamento.whatsappColetarLead` | `WhatsAppGateProvider` | Idem |
| `rotulos.dimensoes` | Filtros catálogo, picker PDP, admin variantes | Idem |
| `rotulos.navCategorias` | Menu `categorias` | Drawer / header |
| `vitrine.*` | Home limits, catálogo page size | Idem |
| `navegacao` | Header, drawer, topbar | `PublicMobileNav` @768 |
| `banners` + `ctaTexto` | Home banners | Imagens fluidas |
| `metaReceitaMensal` | Progresso de meta no Painel (aba Negócio) | Admin |

## Scripts de governança

- `npm run seed:validate` — valida fragmentos de config e catálogo.
- `npm run check:store-copy` — falha se strings vitrine conhecidas aparecerem em TSX sem usar `store-copy` / `site.textos` (ver `scripts/check-store-copy.ts`).
- `npm run data:migrate` — aplica migrations JSON pendentes (mesma ordem do boot). A migration inicial `2026-07-production-baseline` converte o modelo de produção; `2026-07-split-site-config-by-tab` fatia `site.json`; `2026-07-merge-geral-config-tab` une Identidade+Painel em Geral. Ledger em `configuracoes/migrations.json`.

## Variantes de produto

Produtos usam `variantes[].atributos` (chaves = `rotulos.dimensoes[].id`). Legado `tamanho`/`cor` é migrado no parse Zod e persistido pela migration `2026-07-product-variant-atributos` (boot ou CLI).

## Repositórios de loja

Novos campos nos fragmentos têm default no schema; lojas já existentes são atualizadas pelas migrations no startup ou com `npm run data:migrate`.
