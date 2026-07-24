import { ChevronLeft, ChevronRight } from 'lucide-react';
import { InertiaActionLink } from '@/components/ui/InertiaActionLink';
import type { PaginatedData } from '@/types/index.d.ts';

interface PaginationProps {
  links: PaginatedData<unknown>['links'];
  meta: PaginatedData<unknown>['meta'];
  itemLabel?: string;
}

const navigationClassName =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-card px-3 py-2 font-medium text-foreground text-sm transition-colors hover:border-ring hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const disabledClassName =
  'inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-muted px-3 py-2 font-medium text-muted-foreground text-sm opacity-60';

export function Pagination({ links, meta, itemLabel = '件' }: PaginationProps) {
  if (meta.last_page <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="ページネーション"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-muted-foreground text-sm tabular-nums" role="status">
        {meta.total.toLocaleString('ja-JP')}
        {itemLabel}中 {meta.from?.toLocaleString('ja-JP') ?? 0}–
        {meta.to?.toLocaleString('ja-JP') ?? 0}
        {itemLabel}を表示
      </p>

      <div className="flex items-center gap-2">
        <PaginationLink direction="previous" href={links.prev} />
        <span className="px-2 text-foreground text-sm tabular-nums" aria-current="page">
          {meta.current_page} / {meta.last_page}
        </span>
        <PaginationLink direction="next" href={links.next} />
      </div>
    </nav>
  );
}

interface PaginationLinkProps {
  direction: 'previous' | 'next';
  href: string | null;
}

function PaginationLink({ direction, href }: PaginationLinkProps) {
  const isPrevious = direction === 'previous';
  const label = isPrevious ? '前のページ' : '次のページ';
  const icon = isPrevious ? (
    <ChevronLeft aria-hidden="true" className="size-4" />
  ) : (
    <ChevronRight aria-hidden="true" className="size-4" />
  );

  if (href === null) {
    return (
      <span aria-disabled="true" className={disabledClassName}>
        {isPrevious ? icon : null}
        {label}
        {isPrevious ? null : icon}
      </span>
    );
  }

  return (
    <InertiaActionLink
      href={href}
      aria-label={label}
      className={navigationClassName}
      pendingClassName="opacity-70"
    >
      {isPrevious ? icon : null}
      {label}
      {isPrevious ? null : icon}
    </InertiaActionLink>
  );
}
