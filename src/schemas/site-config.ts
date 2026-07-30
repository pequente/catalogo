import { z } from "zod";
import {
  INSTAGRAM_HANDLE_RE,
  syncInstagram,
} from "@/src/lib/instagram";
import { isoDateSchema, uuidSchema } from "./common";
import {
  DEFAULT_NAVEGACAO,
  siteNavegacaoSchema,
} from "./navigation";
import { normalizeWhatsappTemplates } from "@/src/lib/wa-whatsapp-normalize";
import {
  cartWaTemplatePartsSchema,
  compactCartItemPartsSchema,
  productWaTemplatePartsSchema,
} from "@/src/lib/wa-template-validation";
import {
  migrateSitePersonalizationInput,
  siteComportamentoSchema,
  siteHexColorSchema,
  siteRotulosSchema,
  siteSeoSchema,
  siteTextosExtendedSchema,
  siteTemaSchema,
  siteVitrineSchema,
} from "@/src/schemas/site-personalization";

export {
  productWaTemplatePartsSchema,
  cartWaTemplatePartsSchema,
  compactCartItemPartsSchema,
} from "@/src/lib/wa-template-validation";

export const siteInstagramSchema = z
  .object({
    handle: z.string(),
    url: z.string().optional(),
    mostrar: z.boolean().default(true),
  })
  .transform(syncInstagram)
  .pipe(
    z
      .object({
        handle: z.string(),
        url: z.string(),
        mostrar: z.boolean(),
      })
      .superRefine((val, ctx) => {
        if (!val.handle) {
          if (val.url !== "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "URL deve ficar vazia sem nome de usuário",
              path: ["url"],
            });
          }
          return;
        }
        if (!INSTAGRAM_HANDLE_RE.test(val.handle)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Use só letras, números, ponto e underline (até 30 caracteres)",
            path: ["handle"],
          });
        }
        if (!z.string().url().safeParse(val.url).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "URL do perfil inválida",
            path: ["url"],
          });
        }
      }),
  );

export const siteLayoutSchema = z.enum(["classic", "split", "gallery"]);
export type SiteLayoutId = z.infer<typeof siteLayoutSchema>;

export const siteLogoSchema = z.object({
  id: uuidSchema,
  path: z.string().min(1),
  alt: z.string().min(1),
});

export const siteLogoInputSchema = z
  .object({
    id: uuidSchema,
    path: z.string(),
    alt: z.string().optional(),
    pending: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.pending && !val.path.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "path obrigatório quando a imagem não está pendente",
        path: ["path"],
      });
    }
  });

/** Lift legacy `whatsapp.mostrarCarrinho` / `painel.metaReceitaMensal` to root before parse. */
export function migrateSiteConfigInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  let o = { ...(raw as Record<string, unknown>) };
  const wa = o.whatsapp;
  if (wa && typeof wa === "object" && !Array.isArray(wa)) {
    const waRecord = { ...(wa as Record<string, unknown>) };
    if (o.mostrarCarrinho === undefined && "mostrarCarrinho" in waRecord) {
      o.mostrarCarrinho = waRecord.mostrarCarrinho;
    }
    delete waRecord.mostrarCarrinho;
    o.whatsapp = waRecord;
  }
  const painel = o.painel;
  if (painel && typeof painel === "object" && !Array.isArray(painel)) {
    const painelRecord = painel as Record<string, unknown>;
    if ("metaReceitaMensal" in painelRecord) {
      o.metaReceitaMensal = painelRecord.metaReceitaMensal;
    }
  }
  delete o.painel;
  o = migrateSitePersonalizationInput(o) as Record<string, unknown>;
  return o;
}

const siteConfigCoreSchema = z.object({
  versao: z.number().int().min(1),
  nomeLoja: z.string().min(1),
  /** When a logo image is set, also show `nomeLoja` in the header brand. */
  mostrarNomeComLogo: z.boolean().default(false),
  /** Show cart UI and /carrinho on the public site. */
  mostrarCarrinho: z.boolean().default(true),
  assinatura: z.string().min(1),
  slogan: z.string().min(1),
  layout: siteLayoutSchema.default("classic"),
  cores: z.object({
    primaria: siteHexColorSchema,
    secundaria: siteHexColorSchema,
    fundo: siteHexColorSchema,
    fundoNeutro: siteHexColorSchema,
    borda: siteHexColorSchema,
  }),
  logo: siteLogoSchema.nullable().optional(),
  whatsapp: z
    .object({
      telefone: z.string().min(8),
      mensagemPadrao: z.string(),
      mensagemProdutoParts: productWaTemplatePartsSchema.optional(),
      /** @deprecated Read-only legacy; migrated to mensagemProdutoParts on parse. */
      mensagemProduto: z.string().optional(),
      /** Append product reference next to {nome} in WhatsApp when set. */
      mensagemProdutoIncluirReferencia: z.boolean().default(false),
      mensagemProdutoFormatoItens: z
        .enum(["produto", "compacto"])
        .default("produto"),
      mensagemProdutoItemCompactoParts: compactCartItemPartsSchema.optional(),
      /** Show WhatsApp CTA buttons on the public site. */
      mostrar: z.boolean().default(true),
      mensagemCarrinhoFormatoItens: z
        .enum(["produto", "compacto"])
        .default("produto"),
      mensagemCarrinhoParts: cartWaTemplatePartsSchema.optional(),
      /** @deprecated Read-only legacy; migrated to mensagemCarrinhoParts on parse. */
      mensagemCarrinho: z.string().optional(),
      mensagemCarrinhoItemCompactoParts: compactCartItemPartsSchema.optional(),
      /** @deprecated Read-only legacy; migrated to mensagemCarrinhoItemCompactoParts on parse. */
      mensagemCarrinhoItemCompacto: z.string().optional(),
    })
    .transform(normalizeWhatsappTemplates),
  /** `url` is derived from `handle` on parse. */
  instagram: siteInstagramSchema,
  endereco: z.object({
    cep: z.string().default(""),
    logradouro: z.string().default(""),
    numero: z.string().default(""),
    complemento: z.string().default(""),
    bairro: z.string().default(""),
    cidade: z.string(),
    uf: z.string(),
    /** Display line derived from structured fields; legacy fallback when empty. */
    texto: z.string(),
    /** Show store address in the public footer. */
    mostrar: z.boolean().default(true),
  }),
  telefones: z
    .object({
      fixo: z.string().default(""),
      celular: z.string().default(""),
      /** When true, footer celular uses `whatsapp.telefone`. */
      usarWhatsappComoCelular: z.boolean().default(true),
      mostrarFixo: z.boolean().default(false),
      mostrarCelular: z.boolean().default(true),
    })
    .default({
      fixo: "",
      celular: "",
      usarWhatsappComoCelular: true,
      mostrarFixo: false,
      mostrarCelular: true,
    }),
  horarios: z.string(),
  textos: siteTextosExtendedSchema,
  rotulos: siteRotulosSchema,
  vitrine: siteVitrineSchema,
  comportamento: siteComportamentoSchema,
  tema: siteTemaSchema,
  seo: siteSeoSchema,
  /** Independent header vs drawer chrome + ordered nav items. */
  navegacao: siteNavegacaoSchema.default(DEFAULT_NAVEGACAO),
  /** Monthly revenue goal shown on the admin dashboard (Negócio). */
  metaReceitaMensal: z.number().min(0).nullable().default(null),
  atualizadoEm: isoDateSchema,
});

export const siteConfigSchema = z.preprocess(
  migrateSiteConfigInput,
  siteConfigCoreSchema,
);

export const siteConfigUpdateSchema = siteConfigCoreSchema
  .omit({ atualizadoEm: true, logo: true })
  .partial()
  .extend({
    versao: z.number().int().min(1),
    logo: siteLogoInputSchema.nullable().optional(),
  });

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type SiteLogo = z.infer<typeof siteLogoSchema>;
