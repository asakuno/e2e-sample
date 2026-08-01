import type { ResolvedComponent } from '@inertiajs/react';
import type { FC, ReactNode } from 'react';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';

export type InertiaPageComponent<Props = Record<string, unknown>> = FC<Props> & {
  layout?: ResolvedComponent['layout'];
};

export function withAuthenticatedLayout(page: ReactNode): ReactNode {
  return <AuthenticatedLayout>{page}</AuthenticatedLayout>;
}
