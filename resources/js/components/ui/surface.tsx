import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const surfaceVariants = cva('border text-card-foreground', {
  variants: {
    tone: {
      default: 'border-border bg-card shadow-xs',
      subtle: 'border-border bg-muted/55',
      dashed: 'border-dashed border-border bg-muted/35',
      transparent: 'border-transparent bg-transparent shadow-none',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-5',
    },
    radius: {
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
    },
  },
  defaultVariants: {
    tone: 'default',
    padding: 'none',
    radius: 'lg',
  },
});

type SurfaceProps = React.ComponentProps<'div'> &
  VariantProps<typeof surfaceVariants> & {
    asChild?: boolean;
  };

function Surface({ className, tone, padding, radius, asChild = false, ...props }: SurfaceProps) {
  const Comp = asChild ? Slot : 'div';

  return (
    <Comp
      data-slot="surface"
      data-tone={tone ?? 'default'}
      className={cn(surfaceVariants({ tone, padding, radius, className }))}
      {...props}
    />
  );
}

export { Surface, surfaceVariants };
