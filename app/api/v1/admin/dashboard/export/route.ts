import { requireAdmin } from "@/src/lib/auth/session";
import { AppError, toErrorResponse } from "@/src/lib/api/errors";
import { csvRow } from "@/src/lib/csv";
import { parseDateOnly } from "@/src/lib/analytics-date";
import { orderTotal } from "@/src/lib/dashboard-aggregates";
import {
  getDashboardOrdersForExport,
  periodForPreset,
  type DashboardPeriodPreset,
} from "@/src/services/dashboard.service";
import { NextRequest, NextResponse } from "next/server";

const PRESETS = new Set<DashboardPeriodPreset>([
  "today",
  "7d",
  "30d",
  "month",
  "custom",
]);

const CANAL_LABEL = {
  whatsapp: "WhatsApp",
  loja_fisica: "Loja física",
} as const;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const presetRaw = sp.get("preset") ?? "7d";
    const preset = (
      PRESETS.has(presetRaw as DashboardPeriodPreset) ? presetRaw : "7d"
    ) as DashboardPeriodPreset;

    let from = sp.get("from") ?? undefined;
    let to = sp.get("to") ?? undefined;

    if (preset !== "custom") {
      const resolved = periodForPreset(preset);
      from = resolved.from;
      to = resolved.to;
    } else {
      if (
        !from ||
        !to ||
        !parseDateOnly(from) ||
        !parseDateOnly(to) ||
        from > to
      ) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Informe as datas De e Até válidas (AAAA-MM-DD)",
          400,
        );
      }
    }

    const rows = await getDashboardOrdersForExport(from, to);
    const lines: string[] = [];
    lines.push(
      csvRow([
        "pedido_id",
        "data",
        "status",
        "canal",
        "cliente",
        "total",
        "itens",
        "observacao",
      ]),
    );
    for (const { order, clienteNome } of rows) {
      const itemCount = order.itens.reduce((s, i) => s + i.quantidade, 0);
      lines.push(
        csvRow([
          order.id,
          order.criadoEm,
          order.status,
          CANAL_LABEL[order.canal],
          clienteNome,
          orderTotal(order).toFixed(2),
          String(itemCount),
          order.observacao ?? "",
        ]),
      );
    }

    const body = `\uFEFF${lines.join("\r\n")}\r\n`;
    const filename = `pedidos-${from}-${to}.csv`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const { status, body } = toErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}
