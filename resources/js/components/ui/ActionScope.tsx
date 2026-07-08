import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from 'react';

export type Awaitable<T> = T | Promise<T>;

export type ActionContext = {
  transition: (callback: () => void) => void;
};

export type ActionCallback = (context: ActionContext) => Awaitable<void>;

type ActionScopeContextValue = {
  isPending: boolean;
  runAction: (action: ActionCallback) => void;
};

const ActionScopeContext = createContext<ActionScopeContextValue | null>(null);

type ActionScopeProps = {
  children: ReactNode;
};

export function ActionScope({ children }: ActionScopeProps) {
  const [isPending, startActionTransition] = useTransition();

  const transition = useCallback<ActionContext['transition']>(
    (callback) => {
      startActionTransition(callback);
    },
    [startActionTransition],
  );

  const runAction = useCallback(
    (action: ActionCallback) => {
      startActionTransition(async () => {
        await action({ transition });
      });
    },
    [startActionTransition, transition],
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
  const [localPending, localStartActionTransition] = useTransition();

  const localTransition = useCallback<ActionContext['transition']>(
    (callback) => {
      localStartActionTransition(callback);
    },
    [localStartActionTransition],
  );

  const runLocalAction = useCallback(
    (action: ActionCallback) => {
      localStartActionTransition(async () => {
        await action({ transition: localTransition });
      });
    },
    [localStartActionTransition, localTransition],
  );

  const isPending = scope?.isPending ?? localPending;
  const runAction = scope?.runAction ?? runLocalAction;

  return useMemo(
    () => ({
      isPending,
      runAction,
    }),
    [isPending, runAction],
  );
}
