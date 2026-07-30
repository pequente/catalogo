import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyProductionBaselineToProduct,
  applyProductionBaselineToSite,
} from "@/src/lib/data/migrations/production-model";
import { productSchema } from "@/src/schemas/product";
import { siteConfigSchema } from "@/src/schemas/site-config";

/** Minimal slice of production `data-dev` shape (pre-baseline). */
const productionProduct = {
  id: "68e5cf84-198b-452f-8331-d4d983732370",
  versao: 1,
  nome: "Tênis",
  slug: "tenis",
  descricao: "",
  preco: 99.9,
  precoPromocional: null,
  categoriasIds: ["2514631a-33ca-4472-8266-897b502f04d7"],
  status: "ativo",
  destaque: false,
  lancamento: false,
  imagens: [],
  variantes: [
    {
      id: "6b7e23f0-5eb9-4b96-b97e-267d60bd1372",
      tamanho: "34",
      cor: "Preto",
      estoque: 0,
      preco: null,
    },
  ],
  criadoEm: "2026-01-01T00:00:00.000Z",
  atualizadoEm: "2026-01-01T00:00:00.000Z",
};

const productionSite = {
  versao: 1,
  nomeLoja: "Loja",
  assinatura: "Catálogo",
  slogan: "Slogan",
  layout: "classic",
  cores: {
    primaria: "#111",
    secundaria: "#111",
    fundo: "#fff",
    fundoNeutro: "#f5f5f5",
    borda: "#e5e5e5",
  },
  whatsapp: {
    telefone: "11999999999",
    mensagemPadrao: "Olá",
    mensagemProduto: "*Tenho interesse:*\n{nome}",
    mensagemCarrinho: "Pedido:\n{itens}",
    mostrar: true,
  },
  instagram: { handle: "", url: "", mostrar: false },
  endereco: {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    texto: "",
    mostrar: false,
  },
  horarios: "",
  textos: { sobre: "Sobre", trocas: "Trocas" },
  navegacao: {
    topbar: { mostrarEndereco: true, mostrarTelefone: true },
    header: { mostrarBusca: true, itens: [] },
    drawer: {
      mostrarBusca: false,
      extras: {
        mostrarTitulo: true,
        mostrarAssinatura: true,
        mostrarWhatsapp: true,
        mostrarInstagram: true,
      },
      itens: [],
    },
  },
  atualizadoEm: "2026-01-01T00:00:00.000Z",
};

describe("production baseline transforms", () => {
  it("converts variantes tamanho/cor to atributos", () => {
    const next = applyProductionBaselineToProduct(productionProduct);
    assert.ok(productSchema.safeParse(next).success);
    const v = (next as typeof productionProduct).variantes[0] as {
      atributos: { tamanho: string; cor: string };
      tamanho?: string;
    };
    assert.equal(v.atributos.tamanho, "34");
    assert.equal(v.atributos.cor, "Preto");
    assert.equal(v.tamanho, undefined);
  });

  it("expands site.json to current SiteConfig", () => {
    const next = applyProductionBaselineToSite(productionSite);
    const parsed = siteConfigSchema.safeParse(next);
    assert.ok(parsed.success, JSON.stringify(parsed.error?.flatten()));
    assert.ok(parsed.data!.textos.paginas);
    assert.ok(parsed.data!.rotulos.dimensoes.length > 0);
    assert.ok(parsed.data!.whatsapp.mensagemProdutoParts);
    assert.equal(
      (parsed.data!.whatsapp as { mensagemProduto?: string }).mensagemProduto,
      undefined,
    );
  });
});
