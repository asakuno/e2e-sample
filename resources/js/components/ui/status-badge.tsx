import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex min-h-6 items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs ring-1 ring-inset',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground ring-border',
        primary: 'bg-accent text-accent-foreground ring-primary/15',
        positive: 'bg-positive-muted text-positive ring-positive/20',
        negative: 'bg-negative-muted text-negative ring-negative/20',
        warning: 'bg-warning-muted text-warning ring-warning/20',
        info: 'bg-info-muted text-info ring-info/20',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

type StatusBadgeProps = React.ComponentProps<'span'> & VariantProps<typeof statusBadgeVariants>;

function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-variant={variant ?? 'neutral'}
      className={cn(statusBadgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { StatusBadge, statusBadgeVariants };
