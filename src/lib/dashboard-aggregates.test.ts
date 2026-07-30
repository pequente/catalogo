import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@/src/schemas/order";
import {
  buildFunil,
  buildTopCategorias,
  comparisonMetric,
  computeMetaProgress,
  computeNegocioCore,
  previousPeriodBounds,
} from "@/src/lib/dashboard-aggregates";
import type { Category } from "@/src/schemas/category";
import type { Product } from "@/src/schemas/product";

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "00000000-0000-4000-8000-000000000001",
  versao: 1,
  status: "confirmado",
  canal: "whatsapp",
  clienteId: null,
  itens: [
    {
      produtoId: "00000000-0000-4000-8000-000000000010",
      varianteId: "00000000-0000-4000-8000-000000000011",
      nomeProduto: "Tênis",
      tamanho: "40",
      cor: "Preto",
      quantidade: 2,
      precoUnitario: 100,
    },
  ],
  criadoEm: "2026-07-20T15:00:00.000Z",
  atualizadoEm: "2026-07-20T15:00:00.000Z",
  ...overrides,
});

describe("dashboard-aggregates", () => {
  it("previousPeriodBounds spans same length before from", () => {
    const prev = previousPeriodBounds("2026-07-15", "2026-07-21");
    assert.equal(prev.from, "2026-07-08");
    assert.equal(prev.to, "2026-07-14");
  });

  it("computeNegocioCore sums revenue and units", () => {
    const core = computeNegocioCore([
      baseOrder(),
      baseOrder({
        id: "00000000-0000-4000-8000-000000000002",
        status: "cancelado",
      }),
    ]);
    assert.equal(core.confirmados, 1);
    assert.equal(core.cancelados, 1);
    assert.equal(core.receita, 200);
    assert.equal(core.unidadesVendidas, 2);
    assert.equal(core.taxaCancelamento, 0.5);
  });

  it("comparisonMetric returns null delta when previous is zero", () => {
    const m = comparisonMetric(100, 0);
    assert.equal(m.deltaPct, null);
    assert.equal(m.valorAtual, 100);
  });

  it("computeMetaProgress proportional to period days", () => {
    const meta = computeMetaProgress(3100, "2026-07-01", "2026-07-10", 1000);
    assert.equal(meta.mensal, 3100);
    assert.ok(meta.proporcional && meta.proporcional > 0);
    assert.ok(meta.percentualAtingido != null);
  });

  it("buildFunil avoids division by zero", () => {
    const f = buildFunil(0, 0, 3, 2);
    assert.equal(f.taxaClickParaPedido, 0);
    assert.equal(f.taxaLeadParaPedido, 0);
    assert.equal(f.pedidosCanalWhatsapp, 3);
  });

  it("buildClientContactMix counts contact channels", async () => {
    const { buildClientContactMix } = await import(
      "@/src/lib/dashboard-aggregates"
    );
    const mix = buildClientContactMix([
      {
        id: "00000000-0000-4000-8000-000000000001",
        versao: 1,
        nome: "A",
        email: "a@example.com",
        celular: "11999999999",
        criadoEm: "2026-07-01T00:00:00.000Z",
        atualizadoEm: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        versao: 1,
        nome: "B",
        email: "b@example.com",
        criadoEm: "2026-07-01T00:00:00.000Z",
        atualizadoEm: "2026-07-01T00:00:00.000Z",
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        versao: 1,
        nome: "C",
        celular: "21988888888",
        criadoEm: "2026-07-01T00:00:00.000Z",
        atualizadoEm: "2026-07-01T00:00:00.000Z",
      },
    ]);
    assert.equal(mix.comCelular, 2);
    assert.equal(mix.comEmail, 2);
    assert.equal(mix.comAmbos, 1);
    assert.equal(mix.soCelular, 1);
    assert.equal(mix.soEmail, 1);
  });

  it("buildTopClientesPorReceita ranks by revenue", async () => {
    const { buildTopClientesPorReceita } = await import(
      "@/src/lib/dashboard-aggregates"
    );
    const clientId = "00000000-0000-4000-8000-000000000020";
    const clientById = new Map([
      [
        clientId,
        {
          id: clientId,
          versao: 1,
          nome: "Maria",
          criadoEm: "2026-07-01T00:00:00.000Z",
          atualizadoEm: "2026-07-01T00:00:00.000Z",
        },
      ],
    ]);
    const top = buildTopClientesPorReceita(
      [
        baseOrder({ clienteId: clientId }),
        baseOrder({
          id: "00000000-0000-4000-8000-000000000003",
          clienteId: clientId,
        }),
        baseOrder({
          id: "00000000-0000-4000-8000-000000000004",
          clienteId: null,
        }),
      ],
      clientById,
      5,
    );
    assert.equal(top.length, 1);
    assert.equal(top[0]?.nome, "Maria");
    assert.equal(top[0]?.pedidos, 2);
    assert.equal(top[0]?.receita, 400);
  });

  it("buildTopCategorias aggregates by product categories", () => {
    const product: Product = {
      id: "00000000-0000-4000-8000-000000000010",
      versao: 1,
      nome: "P",
      slug: "p",
      descricao: "",
      referencia: "",
      preco: 100,
      precoPromocional: null,
      categoriasIds: ["00000000-0000-4000-8000-000000000020"],
      status: "ativo",
      destaque: false,
      lancamento: false,
      imagens: [],
      variantes: [],
      criadoEm: "2026-01-01T00:00:00.000Z",
      atualizadoEm: "2026-01-01T00:00:00.000Z",
    };
    const category: Category = {
      id: "00000000-0000-4000-8000-000000000020",
      versao: 1,
      nome: "Calçados",
      slug: "calcados",
      ativo: true,
      ordem: 0,
      parentId: null,
      criadoEm: "2026-01-01T00:00:00.000Z",
      atualizadoEm: "2026-01-01T00:00:00.000Z",
    };
    const top = buildTopCategorias(
      [baseOrder()],
      new Map([[product.id, product]]),
      new Map([[category.id, category]]),
      5,
    );
    assert.equal(top.length, 1);
    assert.equal(top[0]?.nome, "Calçados");
    assert.equal(top[0]?.receita, 200);
  });
});
