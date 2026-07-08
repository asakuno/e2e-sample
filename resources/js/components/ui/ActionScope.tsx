import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from 'react';

export type Awaitable<T> = T | Promise<T>;

type ActionScopeContextValue = {
  isPending: boolean;
  runAction: (action: () => Awaitable<void>) => void;
};

const ActionScopeContext = createContext<ActionScopeContextValue | null>(null);

type ActionScopeProps = {
  children: ReactNode;
};

export function ActionScope({ children }: ActionScopeProps) {
  const [isPending, startTransition] = useTransition();

  const runAction = useCallback(
    (action: () => Awaitable<void>) => {
      startTransition(async () => {
        await action();
      });
    },
    [startTransition],
  );

  const value = useMemo<ActionScopeContextValue>(
    () => ({
      isPending,
      runAction,
    }),
    [isPending, runAction],
  );

  return <ActionScopeContext.Provider value={value}>{children}</ActionScopeContext.Provider>;
}

export function useActionScope() {
  return useContext(ActionScopeContext);
}

export function useActionRunner() {
  const scope = useActionScope();
  const [localPending, localStartTransition] = useTransition();

  const runLocalAction = useCallback(
    (action: () => Awaitable<void>) => {
      localStartTransition(async () => {
        await action();
      });
    },
    [localStartTransition],
  );

  return {
    isPending: scope?.isPending ?? localPending,
    runAction: scope?.runAction ?? runLocalAction,
  };
}
