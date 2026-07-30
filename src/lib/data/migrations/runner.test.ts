import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { migrationProductionBaseline } from "@/src/lib/data/migrations/migrations/2026-07-production-baseline";
import { jsonDocumentsEqual } from "@/src/lib/data/migrations/json-equal";
import {
  assertRegistryValid,
  DATA_MIGRATIONS,
} from "@/src/lib/data/migrations/registry";
import type { MigrationContext } from "@/src/lib/data/migrations/types";
import { migrateProductDocument } from "@/src/schemas/product";
import {
  applyCommitFilesTransactional,
  resolveUnderRoot,
} from "@/src/lib/data/fs-commit";

describe("data migrations registry", () => {
  it("has unique ids and orders", () => {
    assert.doesNotThrow(() => assertRegistryValid(DATA_MIGRATIONS));
    assert.ok(DATA_MIGRATIONS.length >= 1);
  });
});

describe("migrateProductDocument", () => {
  it("moves tamanho/cor into atributos", () => {
    const raw = {
      id: "00000000-0000-4000-8000-000000000001",
      variantes: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          tamanho: " M ",
          cor: "Azul",
          estoque: 1,
        },
      ],
    };
    const migrated = migrateProductDocument(raw) as {
      variantes: Array<{ atributos: Record<string, string>; tamanho?: string }>;
    };
    assert.equal(migrated.variantes[0]!.atributos.tamanho, "M");
    assert.equal(migrated.variantes[0]!.atributos.cor, "Azul");
    assert.equal(migrated.variantes[0]!.tamanho, undefined);
    assert.ok(jsonDocumentsEqual(migrateProductDocument(migrated), migrated));
  });
});

describe("migrationProductionBaseline", () => {
  it("writes migrated produto JSON", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "data-migrate-"));
    const productPath = "produtos/00000000-0000-4000-8000-000000000010.json";
    try {
      await fs.mkdir(path.join(root, "produtos"), { recursive: true });
      const product = {
        id: "00000000-0000-4000-8000-000000000010",
        versao: 1,
        nome: "Teste",
        slug: "teste",
        descricao: "",
        referencia: "",
        preco: 10,
        precoPromocional: null,
        categoriasIds: ["00000000-0000-4000-8000-000000000011"],
        status: "ativo",
        destaque: false,
        lancamento: false,
        imagens: [],
        variantes: [
          {
            id: "00000000-0000-4000-8000-000000000012",
            tamanho: "P",
            cor: "Preto",
            estoque: 2,
          },
        ],
        criadoEm: "2026-01-01T00:00:00.000Z",
        atualizadoEm: "2026-01-01T00:00:00.000Z",
      };
      await fs.writeFile(
        path.join(root, productPath),
        `${JSON.stringify(product, null, 2)}\n`,
        "utf8",
      );

      const ctx: MigrationContext = {
        trigger: "cli",
        dryRun: false,
        readJson: async (rel) => {
          try {
            const raw = await fs.readFile(path.join(root, rel), "utf8");
            return JSON.parse(raw) as unknown;
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
            throw e;
          }
        },
        listJsonDir: async (dir) => {
          const names = await fs.readdir(path.join(root, dir));
          return names.filter((n) => n.endsWith(".json")).sort();
        },
      };

      const first = await migrationProductionBaseline.run(ctx);
      assert.equal(first.changes.length, 1);
      await applyCommitFilesTransactional(first.changes, (rel) =>
        resolveUnderRoot(root, rel),
      );

      const second = await migrationProductionBaseline.run(ctx);
      assert.equal(second.changes.length, 0);

      const saved = JSON.parse(
        await fs.readFile(path.join(root, productPath), "utf8"),
      ) as { variantes: Array<{ atributos: { tamanho: string } }> };
      assert.equal(saved.variantes[0]!.atributos.tamanho, "P");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe("migrationSplitSiteConfigByTab", () => {
  it("splits site.json into fragments and deletes legacy", async () => {
    const { migrationSplitSiteConfigByTab } = await import(
      "@/src/lib/data/migrations/migrations/2026-07-split-site-config-by-tab"
    );
    const { DEFAULT_SITE_CONFIG } = await import(
      "@/src/config/default-site-config"
    );
    const { SITE_CONFIG_META_PATH, SITE_CONFIG_TAB_PATHS } = await import(
      "@/src/schemas/site-config-tabs"
    );

    const files = new Map<string, unknown>([
      ["configuracoes/site.json", DEFAULT_SITE_CONFIG],
    ]);
    const ctx: MigrationContext = {
      trigger: "cli",
      dryRun: true,
      readJson: async <T>(relativePath: string) =>
        files.has(relativePath) ? (files.get(relativePath) as T) : null,
      listJsonDir: async () => [],
    };
    const result = await migrationSplitSiteConfigByTab.run(ctx);
    assert.ok(result.changes.some((c) => c.path === SITE_CONFIG_META_PATH));
    assert.ok(
      result.changes.some((c) => c.path === SITE_CONFIG_TAB_PATHS.geral),
    );
    assert.ok(
      result.changes.some(
        (c) =>
          c.path === "configuracoes/site.json" &&
          "delete" in c &&
          c.delete === true,
      ),
    );
  });

  it("is a no-op when already split", async () => {
    const { migrationSplitSiteConfigByTab } = await import(
      "@/src/lib/data/migrations/migrations/2026-07-split-site-config-by-tab"
    );
    const files = new Map<string, unknown>([
      [
        "configuracoes/meta.json",
        { versao: 1, atualizadoEm: "2026-01-01T00:00:00.000Z" },
      ],
    ]);
    const ctx: MigrationContext = {
      trigger: "cli",
      dryRun: true,
      readJson: async <T>(relativePath: string) =>
        files.has(relativePath) ? (files.get(relativePath) as T) : null,
      listJsonDir: async () => [],
    };
    const result = await migrationSplitSiteConfigByTab.run(ctx);
    assert.equal(result.changes.length, 0);
    assert.equal(result.stats.skipped, "already-split");
  });
});

describe("migrationMergeGeralConfigTab", () => {
  it("merges identidade + painel into geral and deletes legacy", async () => {
    const { migrationMergeGeralConfigTab } = await import(
      "@/src/lib/data/migrations/migrations/2026-07-merge-geral-config-tab"
    );
    const { SITE_CONFIG_TAB_PATHS } = await import(
      "@/src/schemas/site-config-tabs"
    );

    const files = new Map<string, unknown>([
      [
        "configuracoes/identidade.json",
        {
          nomeLoja: "Loja migrada",
          mostrarNomeComLogo: false,
          mostrarCarrinho: true,
          assinatura: "Assinatura",
          slogan: "Slogan",
          cores: {
            primaria: "#111111",
            secundaria: "#111111",
            fundo: "#FFFFFF",
            fundoNeutro: "#F5F5F5",
            borda: "#E5E5E5",
          },
          logo: null,
        },
      ],
      [
        "configuracoes/painel.json",
        { painel: { metaReceitaMensal: 42000 } },
      ],
    ]);
    const ctx: MigrationContext = {
      trigger: "cli",
      dryRun: true,
      readJson: async <T>(relativePath: string) =>
        files.has(relativePath) ? (files.get(relativePath) as T) : null,
      listJsonDir: async () => [],
    };
    const result = await migrationMergeGeralConfigTab.run(ctx);
    const geralWrite = result.changes.find(
      (c) => c.path === SITE_CONFIG_TAB_PATHS.geral && "content" in c,
    );
    assert.ok(geralWrite && "content" in geralWrite);
    const geral = JSON.parse(geralWrite.content as string) as {
      nomeLoja: string;
      metaReceitaMensal: number | null;
    };
    assert.equal(geral.nomeLoja, "Loja migrada");
    assert.equal(geral.metaReceitaMensal, 42000);
    assert.ok(
      result.changes.some(
        (c) =>
          c.path === "configuracoes/identidade.json" &&
          "delete" in c &&
          c.delete === true,
      ),
    );
    assert.ok(
      result.changes.some(
        (c) =>
          c.path === "configuracoes/painel.json" &&
          "delete" in c &&
          c.delete === true,
      ),
    );
  });

  it("is a no-op when already merged", async () => {
    const { migrationMergeGeralConfigTab } = await import(
      "@/src/lib/data/migrations/migrations/2026-07-merge-geral-config-tab"
    );
    const files = new Map<string, unknown>([
      [
        "configuracoes/geral.json",
        {
          nomeLoja: "Já geral",
          mostrarNomeComLogo: false,
          mostrarCarrinho: true,
          assinatura: "A",
          slogan: "S",
          cores: {
            primaria: "#111111",
            secundaria: "#111111",
            fundo: "#FFFFFF",
            fundoNeutro: "#F5F5F5",
            borda: "#E5E5E5",
          },
          logo: null,
          metaReceitaMensal: null,
        },
      ],
    ]);
    const ctx: MigrationContext = {
      trigger: "cli",
      dryRun: true,
      readJson: async <T>(relativePath: string) =>
        files.has(relativePath) ? (files.get(relativePath) as T) : null,
      listJsonDir: async () => [],
    };
    const result = await migrationMergeGeralConfigTab.run(ctx);
    assert.equal(result.changes.length, 0);
    assert.equal(result.stats.skipped, "already-merged");
  });
});
