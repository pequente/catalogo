export type DashboardPeriodPreset =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type DashboardSeriePoint = {
  date: string;
  pedidos: number;
  receita: number;
};

export type DashboardCanalDetalhe = {
  pedidos: number;
  confirmados: number;
  cancelados: number;
  receita: number;
  ticketMedio: number;
};

export type DashboardComparacaoMetric = {
  valorAtual: number;
  valorAnterior: number;
  deltaPct: number | null;
};

export type DashboardStats = {
  period: { from: string; to: string };
  catalogo: {
    produtos: number;
    ativos: number;
    ocultos: number;
    esgotados: number;
    categorias: number;
    categoriasAtivas: number;
    bannersAtivos: number;
    unidadesEstoque: number;
    produtosEstoqueZero: number;
    destaques: number;
    lancamentos: number;
    comPromocao: number;
    semCapa: number;
    topProdutos: Array<{
      produtoId: string;
      nome: string;
      quantidade: number;
      receita: number;
    }>;
  };
  negocio: {
    pedidos: number;
    confirmados: number;
    cancelados: number;
    taxaCancelamento: number;
    receita: number;
    ticketMedio: number;
    canalWhatsapp: number;
    canalLoja: number;
    unidadesVendidas: number;
    pedidosComCliente: number;
    pedidosSemCliente: number;
    clientesRecorrentes: number;
    canalDetalhe: {
      whatsapp: DashboardCanalDetalhe;
      loja_fisica: DashboardCanalDetalhe;
    };
    funil: {
      waClicks: number;
      pedidosCanalWhatsapp: number;
      taxaClickParaPedido: number;
      leadsLinked: number;
      pedidosComCliente: number;
      taxaLeadParaPedido: number;
    };
    meta: {
      mensal: number | null;
      proporcional: number | null;
      receitaPeriodo: number;
      percentualAtingido: number | null;
    };
    comparacao: {
      anterior: { from: string; to: string };
      receita: DashboardComparacaoMetric;
      confirmados: DashboardComparacaoMetric;
      ticketMedio: DashboardComparacaoMetric;
      taxaCancelamento: DashboardComparacaoMetric;
    };
  };
  serie: DashboardSeriePoint[];
  serieCanal: {
    whatsapp: DashboardSeriePoint[];
    loja_fisica: DashboardSeriePoint[];
  };
  negocioTopProdutos: Array<{
    produtoId: string;
    nome: string;
    quantidade: number;
    receita: number;
  }>;
  negocioTopCategorias: Array<{
    categoriaId: string;
    nome: string;
    quantidade: number;
    receita: number;
  }>;
  negocioMix: {
    tamanhos: Array<{ label: string; quantidade: number }>;
    cores: Array<{ label: string; quantidade: number }>;
  };
  negocioRecentes: Array<{
    id: string;
    criadoEm: string;
    status: "confirmado" | "cancelado";
    canal: "whatsapp" | "loja_fisica";
    total: number;
    clienteNome: string | null;
  }>;
  negocioPorDiaSemana: Array<{
    dow: number;
    label: string;
    pedidos: number;
    receita: number;
  }>;
  negocioPorHora: Array<{ hour: number; pedidos: number }>;
  clientes: {
    /** Base total de clientes cadastrados (independente do período). */
    total: number;
    /** Novos com `criadoEm` no período. */
    novos: number;
    /**
     * Novos no período com ≥1 pedido confirmado em qualquer data
     * (não necessariamente no período).
     */
    novosComPedido: number;
    novosSemPedido: number;
    /** `novosComPedido / novos` (0 se novos = 0). */
    taxaConversaoNovos: number;
    /** Clientes com ≥2 pedidos confirmados no período. */
    recorrentes: number;
    /** Clientes da base sem nenhum pedido confirmado. */
    nuncaCompraram: number;
    contato: {
      comCelular: number;
      comEmail: number;
      comAmbos: number;
      soCelular: number;
      soEmail: number;
    };
    atribuicao: {
      pedidosComCliente: number;
      pedidosSemCliente: number;
    };
    serieCadastros: Array<{ date: string; count: number }>;
    topPorReceita: Array<{
      id: string;
      nome: string;
      pedidos: number;
      receita: number;
    }>;
    recentes: Array<{
      id: string;
      nome: string;
      criadoEm: string;
      temPedido: boolean;
      temCelular: boolean;
      temEmail: boolean;
      pedidosCount: number;
    }>;
  };
  usabilidade: {
    pageviews: number;
    sessions: number;
    sessionDurationMs: number;
    avgSessionMs: number;
    waClicks: number;
    leadsLinked: number;
    topPaths: Array<{ path: string; count: number }>;
    waBySource: Array<{ source: string; count: number }>;
    waTopProdutos: Array<{
      produtoId: string;
      nome: string;
      count: number;
    }>;
    daily: Array<{
      date: string;
      pageviews: number;
      sessions: number;
      waClicks: number;
    }>;
  };
};
