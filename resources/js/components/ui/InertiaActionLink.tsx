import type React from 'react';
import { ActionLink } from '@/components/ui/ActionLink';
import { visitAction, type VisitOptions } from '@/lib/inertia-actions';

type InertiaActionLinkVisitOptions = Omit<
  VisitOptions,
  'data' | 'forceFormData' | 'headers' | 'method'
> & {
  data?: never;
  forceFormData?: never;
  headers?: never;
  method?: never;
};

type InertiaActionLinkProps = Omit<React.ComponentProps<typeof ActionLink>, 'action'> & {
  visitOptions?: InertiaActionLinkVisitOptions;
};

export function InertiaActionLink({ href, visitOptions, ...props }: InertiaActionLinkProps) {
  return <ActionLink {...props} href={href} action={visitAction(href, visitOptions)} />;
}
