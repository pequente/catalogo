#!/usr/bin/env tsx
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addDaysDateOnly,
  dateInSaoPaulo,
  eachDateInclusive,
  isoDayInSaoPaulo,
  periodBoundsIso,
  startOfMonthDateOnly,
} from "@/src/lib/analytics-date";
import { variantSellPrice } from "@/src/lib/front/pricing";
import type { Category } from "@/src/schemas/category";
import { clientSchema } from "@/src/schemas/client";
import { dailyAnalyticsSchema } from "@/src/schemas/analytics";
import type { DailyAnalytics } from "@/src/schemas/analytics";
import { orderSchema, type Order, type OrderItem } from "@/src/schemas/order";
import { productSchema, variantAttr, type Product, type ProductVariant } from "@/src/schemas/product";
import { categorySchema } from "@/src/schemas/category";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DEV = path.join(repoRoot, "data-dev");

const CONFIG = {
  products: intEnv("SEED_PRODUCTS", 800),
  clients: intEnv("SEED_CLIENTS", 6000),
  orders: intEnv("SEED_ORDERS", 25000),
  analyticsDays: intEnv("SEED_ANALYTICS_DAYS", 180),
  rngSeed: intEnv("SEED_RNG", 42),
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function pickWeighted<T>(rng: () => number, items: { value: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1]!.value;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function uniqueSlug(base: string, used: Set<string>): string {
  const slug = slugify(base) || "item";
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let n = 2;
  while (used.has(`${slug}-${n}`)) n += 1;
  const finalSlug = `${slug}-${n}`;
  used.add(finalSlug);
  return finalSlug;
}

function randomIsoInDay(day: string, rng: () => number): string {
  const bounds = periodBoundsIso(day, day);
  if (!bounds) return new Date().toISOString();
  const start = new Date(bounds.startIso).getTime();
  const end = new Date(bounds.endIso).getTime();
  const t = start + Math.floor(rng() * (end - start + 1));
  return new Date(t).toISOString();
}

async function ensureDataDev() {
  try {
    const st = await fs.stat(DATA_DEV);
    if (!st.isDirectory()) throw new Error("not dir");
  } catch {
    console.error(`data-dev não encontrado. Rode npm run dev:reset:data antes.`);
    process.exit(1);
  }
}

async function emptyJsonDir(relativeDir: string) {
  const dir = path.join(DATA_DEV, relativeDir);
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  await Promise.all(
    entries
      .filter((e) => e.endsWith(".json"))
      .map((e) => fs.unlink(path.join(dir, e))),
  );
}

async function scanProductImages(): Promise<{ id: string; path: string }[]> {
  const imgDir = path.join(DATA_DEV, "imagens/produtos");
  let files: string[];
  try {
    files = await fs.readdir(imgDir);
  } catch {
    return [];
  }
  const pool = files
    .filter((f) => /\.(jpe?g|webp|png)$/i.test(f))
    .map((f) => {
      const id = path.basename(f, path.extname(f));
      return { id, path: `imagens/produtos/${f}` };
    });
  if (pool.length === 0) {
    console.warn("Nenhuma imagem em imagens/produtos; produtos ficarão sem imagens.");
  }
  return pool;
}

async function writeJsonBatch(
  subdir: string,
  records: Array<{ id: string; body: unknown }>,
  label: string,
  chunkSize = 100,
) {
  const dir = path.join(DATA_DEV, subdir);
  await fs.mkdir(dir, { recursive: true });
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(({ id, body }) =>
        fs.writeFile(path.join(dir, `${id}.json`), `${JSON.stringify(body, null, 2)}\n`),
      ),
    );
    console.log(`  ${label}: ${Math.min(i + chunkSize, records.length)}/${records.length}`);
  }
}

const DDDS = ["11", "16", "17", "19", "14", "21", "27", "31"] as const;
const FIRST_NAMES = [
  "Ana",
  "Maria",
  "Juliana",
  "Fernanda",
  "Camila",
  "Patricia",
  "Carla",
  "Luciana",
  "Roberto",
  "Carlos",
  "João",
  "Pedro",
  "Lucas",
  "Marcos",
  "Rafael",
  "Bruno",
  "Tiago",
  "Felipe",
  "Gabriel",
  "Diego",
];
const LAST_NAMES = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Lima",
  "Ferreira",
  "Almeida",
  "Costa",
  "Rodrigues",
  "Martins",
  "Pereira",
  "Carvalho",
  "Gomes",
  "Ribeiro",
  "Barbosa",
];
const BRANDS = [
  "Plumax",
  "Rider",
  "Olympikus",
  "Beira Rio",
  "Vizzano",
  "Moleca",
  "Usaflex",
  "Piccadilly",
  "Klin",
  "Pampili",
  "Havaianas",
  "Ipanema",
  "Grendene",
  "Azaleia",
  "West Coast",
];
const COLORS = [
  "Preto",
  "Branco",
  "Marinho",
  "Cinza",
  "Bege",
  "Vermelho",
  "Rosa",
  "Preto Dourado",
  "Marrom",
  "Nude",
];
const SIZES = ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

const CATEGORY_TREE: Array<{
  nome: string;
  children?: string[];
}> = [
  { nome: "Tênis", children: ["Casual", "Esportivo", "Infantil", "Feminino", "Masculino"] },
  { nome: "Chinelos", children: ["Slide", "Clássico", "Infantil"] },
  { nome: "Sandálias", children: ["Rasteira", "Salto", "Anabela"] },
  { nome: "Bolsas", children: ["Transversal", "Mochila", "Carteira"] },
  { nome: "Acessórios", children: ["Meias", "Palmilhas", "Cadarços"] },
];

const PRODUCT_KINDS = [
  "Tênis",
  "Chinelo",
  "Sandália",
  "Bota",
  "Sapatilha",
  "Mocassim",
  "Bolsa",
  "Carteira",
  "Meia",
  "Palmilha",
];

const WA_SOURCES = [
  "home",
  "home_strip",
  "header",
  "mobile_nav",
  "sobre",
  "pdp",
  "footer",
  "cart",
] as const;

function generateCategories(rng: () => number): Category[] {
  const now = new Date().toISOString();
  const usedSlugs = new Set<string>();
  const categories: Category[] = [];
  let ordem = 0;

  for (const root of CATEGORY_TREE) {
    const rootId = crypto.randomUUID();
    const rootSlug = uniqueSlug(root.nome, usedSlugs);
    categories.push({
      id: rootId,
      versao: 1,
      nome: root.nome,
      slug: rootSlug,
      ordem: ordem++,
      ativo: true,
      parentId: null,
      criadoEm: now,
      atualizadoEm: now,
    });
    for (const childName of root.children ?? []) {
      const childId = crypto.randomUUID();
      const nome = `${childName} ${root.nome}`.replace(/\s+/g, " ").trim();
      categories.push({
        id: childId,
        versao: 1,
        nome,
        slug: uniqueSlug(nome, usedSlugs),
        ordem: ordem++,
        ativo: rng() > 0.05,
        parentId: rootId,
        criadoEm: now,
        atualizadoEm: now,
      });
    }
  }
  return categories;
}

function generateProducts(
  rng: () => number,
  categories: Category[],
  imagePool: { id: string; path: string }[],
  count: number,
): Product[] {
  const leafCategories = categories.filter((c) => c.parentId != null && c.ativo);
  const fallbackCats = categories.filter((c) => c.ativo);
  const catPool = leafCategories.length > 0 ? leafCategories : fallbackCats;
  const usedSlugs = new Set<string>();
  const products: Product[] = [];

  for (let i = 0; i < count; i += 1) {
    const brand = pick(rng, BRANDS);
    const kind = pick(rng, PRODUCT_KINDS);
    const ref = String(1000 + Math.floor(rng() * 9000));
    const nome = `${kind} ${brand} Ref ${ref}`;
    const id = crypto.randomUUID();
    const cat = pick(rng, catPool);
    const preco = Math.round((49 + rng() * 250) * 10) / 10;
    const hasPromo = rng() < 0.35;
    const precoPromocional = hasPromo
      ? Math.round(preco * (0.75 + rng() * 0.2) * 10) / 10
      : null;
    const status = pickWeighted(rng, [
      { value: "ativo" as const, weight: 82 },
      { value: "oculto" as const, weight: 8 },
      { value: "esgotado" as const, weight: 10 },
    ]);
    const numColors = 1 + Math.floor(rng() * 2);
    const colors = Array.from({ length: numColors }, () => pick(rng, COLORS));
    const variantes: ProductVariant[] = [];
    for (const cor of colors) {
      for (const tamanho of SIZES) {
        if (rng() < 0.15 && tamanho !== "38" && tamanho !== "39") continue;
        variantes.push({
          id: crypto.randomUUID(),
          atributos: { tamanho, cor },
          estoque: status === "esgotado" ? 0 : 5 + Math.floor(rng() * 26),
          preco: null,
        });
      }
    }
    if (variantes.length === 0) {
      variantes.push({
        id: crypto.randomUUID(),
        atributos: { tamanho: "38", cor: pick(rng, COLORS) },
        estoque: 10,
        preco: null,
      });
    }
    const numImages = imagePool.length === 0 ? 0 : 1 + Math.floor(rng() * 3);
    const imagens = Array.from({ length: Math.min(numImages, 3) }, (_, ordem) => {
      const img = pick(rng, imagePool);
      return { id: img.id, path: img.path, ordem };
    });
    const createdDay = pick(
      rng,
      eachDateInclusive(addDaysDateOnly(dateInSaoPaulo(), -365), dateInSaoPaulo()),
    );
    const created = randomIsoInDay(createdDay, rng);
    products.push({
      id,
      versao: 1,
      nome,
      slug: uniqueSlug(`${nome}-${ref}`, usedSlugs),
      descricao: `Marca: ${brand}\nReferência: ${ref}\n${kind} para o dia a dia.`,
      referencia: ref,
      preco,
      precoPromocional,
      categoriasIds: [cat.id],
      status,
      destaque: rng() < 0.08,
      lancamento: rng() < 0.12,
      imagens,
      variantes,
      criadoEm: created,
      atualizadoEm: created,
    });
  }
  return products;
}

function generateClients(rng: () => number, count: number) {
  const clients: Array<ReturnType<typeof clientSchema.parse>> = [];
  const usedPhones = new Set<string>();
  const rangeStart = addDaysDateOnly(dateInSaoPaulo(), -365);
  const rangeEnd = dateInSaoPaulo();

  for (let i = 0; i < count; i += 1) {
    const nome = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    let celular: string | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const ddd = pick(rng, DDDS);
      const nine = "9";
      const rest = String(Math.floor(rng() * 900000000) + 100000000).slice(0, 8);
      const candidate = `${ddd}${nine}${rest}`.slice(0, 11);
      if (candidate.length >= 10 && !usedPhones.has(candidate)) {
        usedPhones.add(candidate);
        celular = candidate;
        break;
      }
    }
    const email =
      rng() < 0.3
        ? `${slugify(nome).replace(/-/g, ".")}${i}@example.com`
        : undefined;
    const day = pick(rng, eachDateInclusive(rangeStart, rangeEnd));
    const criadoEm = randomIsoInDay(day, rng);
    const client = {
      id: crypto.randomUUID(),
      versao: 1,
      nome,
      email,
      celular,
      criadoEm,
      atualizadoEm: criadoEm,
    };
    clients.push(clientSchema.parse(client));
  }
  return clients;
}

function variantKey(produtoId: string, varianteId: string) {
  return `${produtoId}:${varianteId}`;
}

function buildOrderItem(product: Product, variant: ProductVariant): OrderItem {
  return {
    produtoId: product.id,
    varianteId: variant.id,
    nomeProduto: product.nome,
    tamanho: variantAttr(variant, "tamanho") ?? "",
    cor: variantAttr(variant, "cor") ?? "",
    referenciaProduto: product.referencia || undefined,
    quantidade: 1,
    precoUnitario: variantSellPrice(product, variant),
  };
}

function generateOrders(
  rng: () => number,
  products: Product[],
  clients: Array<{ id: string }>,
  count: number,
  dayRange: string[],
): { orders: Order[]; stockDeltas: Map<string, number> } {
  const activeProducts = products.filter(
    (p) => p.status === "ativo" && p.variantes.some((v) => v.estoque > 0),
  );
  const orders: Order[] = [];
  const stockDeltas = new Map<string, number>();

  for (let i = 0; i < count; i += 1) {
    const day = pick(rng, dayRange);
    const criadoEm = randomIsoInDay(day, rng);
    const status = rng() < 0.85 ? "confirmado" : "cancelado";
    const canal = rng() < 0.7 ? "whatsapp" : "loja_fisica";
    const clienteId = rng() < 0.65 ? pick(rng, clients).id : null;
    const numItems = 1 + Math.floor(rng() * 4);
    const itens: OrderItem[] = [];

    for (let j = 0; j < numItems; j += 1) {
      const product = pick(rng, activeProducts.length > 0 ? activeProducts : products);
      const inStock = product.variantes.filter((v) => v.estoque > 0);
      const variant = pick(rng, inStock.length > 0 ? inStock : product.variantes);
      const item = buildOrderItem(product, variant);
      item.quantidade = 1 + Math.floor(rng() * 2);
      itens.push(item);
      if (status === "confirmado") {
        const key = variantKey(product.id, variant.id);
        stockDeltas.set(key, (stockDeltas.get(key) ?? 0) + item.quantidade);
      }
    }

    orders.push({
      id: crypto.randomUUID(),
      versao: 1,
      status,
      canal,
      clienteId,
      itens,
      criadoEm,
      atualizadoEm: criadoEm,
    });
  }
  return { orders, stockDeltas };
}

function applyStockDeltas(products: Product[], stockDeltas: Map<string, number>) {
  for (const product of products) {
    for (const variant of product.variantes) {
      const key = variantKey(product.id, variant.id);
      const delta = stockDeltas.get(key);
      if (delta) {
        variant.estoque = Math.max(0, variant.estoque - delta);
      }
    }
  }
}

function orderTotal(order: Order): number {
  return order.itens.reduce((s, it) => s + it.precoUnitario * it.quantidade, 0);
}

function generateDailyAnalytics(
  rng: () => number,
  dayRange: string[],
  orders: Order[],
  products: Product[],
): DailyAnalytics[] {
  const ordersByDay = new Map<string, Order[]>();
  for (const order of orders) {
    const day = isoDayInSaoPaulo(order.criadoEm);
    const list = ordersByDay.get(day) ?? [];
    list.push(order);
    ordersByDay.set(day, list);
  }
  const slugByProductId = new Map(products.map((p) => [p.id, p.slug]));

  return dayRange.map((date) => {
    const dayOrders = ordersByDay.get(date) ?? [];
    const confirmed = dayOrders.filter((o) => o.status === "confirmado");
    const waOrders = dayOrders.filter((o) => o.canal === "whatsapp");
    const baseViews = 20 + Math.floor(rng() * 80);
    const pageviews = baseViews + dayOrders.length * (8 + Math.floor(rng() * 12));
    const sessions = Math.max(1, Math.floor(pageviews / (2 + rng() * 3)));
    const waClicks = Math.max(
      waOrders.length,
      Math.floor(waOrders.length * (1.1 + rng() * 0.8) + rng() * 5),
    );
    const byPath: Record<string, number> = {
      "/": Math.max(1, Math.floor(pageviews * (0.35 + rng() * 0.1))),
      "/catalogo": Math.max(1, Math.floor(pageviews * (0.22 + rng() * 0.08))),
      "/sobre": Math.max(0, Math.floor(pageviews * 0.04)),
    };
    let remainder =
      pageviews - Object.values(byPath).reduce((a, b) => a + b, 0);
    for (const order of confirmed.slice(0, 15)) {
      for (const item of order.itens) {
        const slug = slugByProductId.get(item.produtoId);
        if (!slug) continue;
        const p = `/produto/${slug}`;
        const add = 1 + Math.floor(rng() * 2);
        byPath[p] = (byPath[p] ?? 0) + add;
        remainder -= add;
      }
    }
    if (remainder > 0) {
      byPath["/catalogo"] = (byPath["/catalogo"] ?? 0) + remainder;
    }
    const waBySource: Record<string, number> = {};
    let waLeft = waClicks;
    for (let si = 0; si < WA_SOURCES.length; si += 1) {
      const src = WA_SOURCES[si]!;
      if (si === WA_SOURCES.length - 1) {
        waBySource[src] = Math.max(0, waLeft);
      } else {
        const chunk = Math.floor(waClicks * (0.06 + rng() * 0.1));
        waBySource[src] = chunk;
        waLeft -= chunk;
      }
    }

    const waByProdutoId: Record<string, number> = {};
    for (const order of waOrders) {
      for (const item of order.itens) {
        waByProdutoId[item.produtoId] = (waByProdutoId[item.produtoId] ?? 0) + 1;
      }
    }

    const leadsLinked = Math.floor(
      dayOrders.filter((o) => o.clienteId).length * (0.3 + rng() * 0.4),
    );
    const sessionCount = Math.min(sessions, 800);
    const seenSessionIds = Array.from({ length: sessionCount }, () => crypto.randomUUID());
    const linkedSessionIds = seenSessionIds.slice(0, Math.min(leadsLinked, seenSessionIds.length));

    const row = {
      date,
      pageviews,
      byPath,
      sessions,
      sessionDurationMs: sessions * Math.floor(45000 + rng() * 120000),
      waClicks,
      waBySource,
      waByProdutoId,
      leadsLinked,
      seenSessionIds,
      linkedSessionIds,
    };
    return dailyAnalyticsSchema.parse(row);
  });
}

async function updateSiteMeta(orders: Order[]) {
  const metaPath = path.join(DATA_DEV, "configuracoes/meta.json");
  const geralPath = path.join(DATA_DEV, "configuracoes/geral.json");
  const metaRaw = JSON.parse(await fs.readFile(metaPath, "utf8")) as {
    versao: number;
    atualizadoEm: string;
  };
  const geralRaw = JSON.parse(await fs.readFile(geralPath, "utf8")) as {
    metaReceitaMensal?: number | null;
  };
  const today = dateInSaoPaulo();
  const monthStart = startOfMonthDateOnly(today);
  const monthOrders = orders.filter(
    (o) =>
      o.status === "confirmado" &&
      isoDayInSaoPaulo(o.criadoEm) >= monthStart &&
      isoDayInSaoPaulo(o.criadoEm) <= today,
  );
  const receitaMes = monthOrders.reduce((s, o) => s + orderTotal(o), 0);
  const meta = receitaMes > 0 ? Math.round(receitaMes * 1.1) : 50000;
  metaRaw.versao = (metaRaw.versao ?? 1) + 1;
  metaRaw.atualizadoEm = new Date().toISOString();
  geralRaw.metaReceitaMensal = meta;
  await fs.writeFile(metaPath, `${JSON.stringify(metaRaw, null, 2)}\n`);
  await fs.writeFile(geralPath, `${JSON.stringify(geralRaw, null, 2)}\n`);
}

function validateSamples(
  categories: Category[],
  products: Product[],
  clients: ReturnType<typeof clientSchema.parse>[],
  orders: Order[],
) {
  if (categories[0]) categorySchema.parse(categories[0]);
  if (products[0]) productSchema.parse(products[0]);
  if (clients[0]) clientSchema.parse(clients[0]);
  if (orders[0]) orderSchema.parse(orders[0]);
  const mid = products[Math.floor(products.length / 2)];
  if (mid) productSchema.parse(mid);
}

async function main() {
  const started = Date.now();
  console.log("dev:seed — config:", CONFIG);
  await ensureDataDev();

  const rng = mulberry32(CONFIG.rngSeed);
  const imagePool = await scanProductImages();

  console.log("Limpando pastas regeneráveis…");
  await emptyJsonDir("categorias");
  await emptyJsonDir("produtos");
  await emptyJsonDir("clientes");
  await emptyJsonDir("pedidos");
  await emptyJsonDir("analytics/daily");

  console.log("Gerando categorias…");
  const categories = generateCategories(rng);
  await writeJsonBatch(
    "categorias",
    categories.map((c) => ({ id: c.id, body: c })),
    "categorias",
  );

  console.log("Gerando produtos…");
  const products = generateProducts(rng, categories, imagePool, CONFIG.products);

  console.log("Gerando clientes…");
  const clients = generateClients(rng, CONFIG.clients);
  await writeJsonBatch(
    "clientes",
    clients.map((c) => ({ id: c.id, body: c })),
    "clientes",
  );

  const today = dateInSaoPaulo();
  const analyticsFrom = addDaysDateOnly(today, -(CONFIG.analyticsDays - 1));
  const dayRange = eachDateInclusive(analyticsFrom, today);

  console.log("Gerando pedidos…");
  const { orders, stockDeltas } = generateOrders(
    rng,
    products,
    clients,
    CONFIG.orders,
    dayRange,
  );
  applyStockDeltas(products, stockDeltas);

  await writeJsonBatch(
    "produtos",
    products.map((p) => ({ id: p.id, body: p })),
    "produtos",
  );

  console.log("Gerando índices de produtos…");
  {
    const { productToIndexEntry } = await import("@/src/schemas/product-index");
    const { stateFromEntries, serializeProductIndexWrites } = await import(
      "@/src/lib/indices/product-index-core"
    );
    const state = stateFromEntries(products.map((p) => productToIndexEntry(p)));
    const writes = serializeProductIndexWrites(state);
    for (const w of writes) {
      const abs = path.join(DATA_DEV, w.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `${JSON.stringify(w.data, null, 2)}\n`, "utf8");
    }
    console.log(`  índices:    ${state.entries.length} entradas`);
  }

  await writeJsonBatch(
    "pedidos",
    orders.map((o) => ({ id: o.id, body: o })),
    "pedidos",
  );

  console.log("Gerando índices de pedidos…");
  {
    const { orderToIndexEntry } = await import("@/src/schemas/order-index");
    const { stateFromOrderEntries, serializeOrderIndexWrites } = await import(
      "@/src/lib/indices/order-index-core"
    );
    const state = stateFromOrderEntries(orders.map((o) => orderToIndexEntry(o)));
    const writes = serializeOrderIndexWrites(state);
    for (const w of writes) {
      const abs = path.join(DATA_DEV, w.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `${JSON.stringify(w.data, null, 2)}\n`, "utf8");
    }
    console.log(`  índices pedidos: ${state.entries.length} entradas`);
  }

  console.log("Gerando índices de clientes…");
  {
    const { clientToIndexEntry } = await import("@/src/schemas/client-index");
    const { stateFromClientEntries, serializeClientIndexWrites } = await import(
      "@/src/lib/indices/client-index-core"
    );
    const state = stateFromClientEntries(
      clients.map((c) => clientToIndexEntry(c)),
    );
    const writes = serializeClientIndexWrites(state);
    for (const w of writes) {
      const abs = path.join(DATA_DEV, w.path);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, `${JSON.stringify(w.data, null, 2)}\n`, "utf8");
    }
    console.log(`  índices clientes: ${state.entries.length} entradas`);
  }

  console.log("Gerando analytics diários…");
  const dailyRows = generateDailyAnalytics(rng, dayRange, orders, products);
  await writeJsonBatch(
    "analytics/daily",
    dailyRows.map((d) => ({ id: d.date, body: d })),
    "analytics",
  );

  console.log("Atualizando meta de receita…");
  await updateSiteMeta(orders);

  validateSamples(categories, products, clients, orders);

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log("\nResumo:");
  console.log(`  categorias: ${categories.length}`);
  console.log(`  produtos:   ${products.length}`);
  console.log(`  clientes:   ${clients.length}`);
  console.log(`  pedidos:    ${orders.length}`);
  console.log(`  analytics:  ${dailyRows.length} dias (${analyticsFrom} → ${today})`);
  console.log(`  tempo:      ${elapsed}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
