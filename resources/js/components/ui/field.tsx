import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const fieldControlVariants = cva(
  'min-h-11 w-full rounded-md border bg-background px-3 py-2 text-foreground text-sm shadow-xs outline-none transition-[background-color,border-color,box-shadow,color] duration-motion-fast ease-standard placeholder:text-faint-foreground hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70',
  {
    variants: {
      invalid: {
        true: 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
        false: 'border-input',
      },
      kind: {
        control: '',
        textarea: 'min-h-24 resize-y',
      },
    },
    defaultVariants: {
      invalid: false,
      kind: 'control',
    },
  },
);

type FieldLabelProps = React.ComponentProps<'label'>;

function FieldLabel({ className, ...props }: FieldLabelProps) {
  return (
    <label
      data-slot="field-label"
      className={cn('mb-2 block font-medium text-foreground text-sm', className)}
      {...props}
    />
  );
}

type FieldErrorProps = React.ComponentProps<'p'>;

function FieldError({ className, role = 'alert', ...props }: FieldErrorProps) {
  return (
    <p
      data-slot="field-error"
      role={role}
      className={cn('mt-1.5 text-destructive text-sm', className)}
      {...props}
    />
  );
}

type FieldDescriptionProps = React.ComponentProps<'p'>;

function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <p
      data-slot="field-description"
      className={cn('mt-1.5 text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

type FieldControlVariantProps = VariantProps<typeof fieldControlVariants>;

export {
  FieldDescription,
  FieldError,
  FieldLabel,
  fieldControlVariants,
  type FieldControlVariantProps,
};
