import {
  BarChart3,
  Bell,
  Circle,
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

const ICONS: Record<string, LucideIcon> = {
  article: FileText,
  dashboard: LayoutDashboard,
  group: Users,
  logout: LogOut,
  newspaper: Newspaper,
  notifications: Bell,
  query_stats: BarChart3,
  schedule: Clock3,
  search: Search,
  trending_down: TrendingDown,
  trending_up: TrendingUp,
  visibility: Eye,
};

interface AppIconProps {
  name: string;
  className?: string;
}

export function AppIcon({ name, className }: AppIconProps) {
  const Icon = ICONS[name] ?? Circle;

  return <Icon aria-hidden="true" className={cn('size-5 shrink-0', className)} strokeWidth={2} />;
}
