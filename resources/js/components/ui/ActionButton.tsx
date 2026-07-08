import type React from 'react';
import { useActionRunner, type Awaitable } from '@/components/ui/ActionScope';
import { Button } from '@/components/ui/button';

type ActionButtonProps = Omit<React.ComponentProps<typeof Button>, 'onClick' | 'type'> & {
  action: () => Awaitable<void>;
  pendingLabel?: React.ReactNode;
};

export function ActionButton({
  action,
  pendingLabel,
  children,
  disabled,
  'aria-busy': ariaBusy,
  ...props
}: ActionButtonProps) {
  const { isPending, runAction } = useActionRunner();
  const isDisabled = Boolean(disabled || isPending);

  return (
    <Button
      {...props}
      type="button"
      disabled={isDisabled}
      aria-busy={ariaBusy ?? (isPending || undefined)}
      onClick={() => {
        runAction(action);
      }}
    >
      {isPending && pendingLabel != null ? pendingLabel : children}
    </Button>
  );
}
