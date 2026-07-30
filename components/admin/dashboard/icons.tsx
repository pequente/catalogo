import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgePercent,
  Banknote,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  ImageOff,
  LayoutTemplate,
  Link2,
  Mail,
  MessageCircle,
  MousePointerClick,
  Package,
  PackageX,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tags,
  Target,
  Timer,
  TrendingUp,
  UserPlus,
  UserX,
  Users,
  Warehouse,
  XCircle,
} from "lucide-react";

export const ICON_SIZE = 18;
export const ICON_STROKE = 1.75;

export function DashIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Icon
      size={ICON_SIZE}
      strokeWidth={ICON_STROKE}
      className={className}
      aria-hidden
    />
  );
}

export const dashIcons = {
  receita: Banknote,
  pedidos: ShoppingBag,
  ticket: TrendingUp,
  cancelados: XCircle,
  unidades: Package,
  clientes: Users,
  clienteNovo: UserPlus,
  clienteSemPedido: UserX,
  recorrente: RefreshCw,
  whatsapp: MessageCircle,
  email: Mail,
  celular: Phone,
  loja: Store,
  meta: Target,
  export: Download,
  chart: BarChart3,
  tempo: CalendarClock,
  chevron: ChevronRight,
  produtos: Package,
  ativos: CheckCircle2,
  ocultos: EyeOff,
  esgotados: AlertTriangle,
  estoque: Warehouse,
  semEstoque: PackageX,
  destaque: Star,
  lancamento: Sparkles,
  promocao: BadgePercent,
  semCapa: ImageOff,
  categorias: Tags,
  banners: LayoutTemplate,
  pageviews: Eye,
  sessions: Users,
  tempoMedio: Clock,
  duracaoTotal: Timer,
  waClick: MousePointerClick,
  leadLink: Link2,
} as const;
