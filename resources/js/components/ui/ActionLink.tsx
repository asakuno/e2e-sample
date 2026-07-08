import type React from 'react';
import { useActionRunner, type Awaitable } from '@/components/ui/ActionScope';
import { cn } from '@/lib/utils';

type ActionLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'onClick'> & {
  href: string;
  action: () => Awaitable<void>;
  pendingClassName?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function ActionLink({
  href,
  action,
  pendingClassName,
  className,
  onClick,
  target,
  'aria-busy': ariaBusy,
  ...props
}: ActionLinkProps) {
  const { isPending, runAction } = useActionRunner();

  return (
    <a
      {...props}
      href={href}
      target={target}
      aria-busy={ariaBusy ?? (isPending || undefined)}
      data-pending={isPending ? 'true' : undefined}
      className={cn(className, isPending && pendingClassName)}
      onClick={(event) => {
        onClick?.(event);

        if (!shouldHandleNavigation(event, target)) {
          return;
        }

        event.preventDefault();
        runAction(action);
      }}
    />
  );
}

function shouldHandleNavigation(
  event: React.MouseEvent<HTMLAnchorElement>,
  target: React.AnchorHTMLAttributes<HTMLAnchorElement>['target'],
) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    target !== '_blank' &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  );
}
