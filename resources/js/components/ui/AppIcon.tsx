import {
  BarChart3,
  Bell,
  BrainCircuit,
  Clock3,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  article: FileText,
  dashboard: LayoutDashboard,
  group: Users,
  logout: LogOut,
  newspaper: Newspaper,
  notifications: Bell,
  psychology: BrainCircuit,
  query_stats: BarChart3,
  schedule: Clock3,
  search: Search,
  trending_down: TrendingDown,
  trending_up: TrendingUp,
  visibility: Eye,
} as const satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof ICONS;

interface AppIconProps {
  name: AppIconName;
  className?: string;
}

export function AppIcon({ name, className }: AppIconProps) {
  const Icon = ICONS[name];

  return <Icon aria-hidden="true" className={cn('size-5 shrink-0', className)} strokeWidth={2} />;
}
