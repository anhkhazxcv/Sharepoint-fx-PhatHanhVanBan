import * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { PhvbMagLoadingOverlay } from '../components/PhvbMagLoadingOverlay';

interface IPhvbBusyContextValue {
  isBusy: boolean;
  message: string;
  runBusy: <T>(message: string, work: () => Promise<T>) => Promise<T>;
}

const PhvbBusyContext = createContext<IPhvbBusyContextValue | undefined>(undefined);

const DEFAULT_BUSY_MESSAGE = 'Đang xử lý...';

interface IPhvbBusyProviderProps {
  children: React.ReactNode;
}

export function PhvbBusyProvider(props: IPhvbBusyProviderProps): React.ReactElement {
  const { children } = props;
  const [busyCount, setBusyCount] = useState(0);
  const [message, setMessage] = useState(DEFAULT_BUSY_MESSAGE);
  const messageStackRef = useRef<string[]>([]);

  const runBusy = useCallback(async <T,>(busyMessage: string, work: () => Promise<T>): Promise<T> => {
    const normalizedMessage = (busyMessage || '').trim() || DEFAULT_BUSY_MESSAGE;
    messageStackRef.current.push(normalizedMessage);
    setMessage(normalizedMessage);
    setBusyCount(previous => previous + 1);

    try {
      return await work();
    } finally {
      messageStackRef.current.pop();
      const nextMessage = messageStackRef.current[messageStackRef.current.length - 1] || DEFAULT_BUSY_MESSAGE;
      setMessage(nextMessage);
      setBusyCount(previous => Math.max(0, previous - 1));
    }
  }, []);

  const value = useMemo((): IPhvbBusyContextValue => ({
    isBusy: busyCount > 0,
    message,
    runBusy
  }), [busyCount, message, runBusy]);

  return (
    <PhvbBusyContext.Provider value={value}>
      {children}
      <PhvbMagLoadingOverlay
        isOpen={busyCount > 0}
        message={message}
        variant="global"
      />
    </PhvbBusyContext.Provider>
  );
}

export function usePhvbBusy(): IPhvbBusyContextValue {
  const context = useContext(PhvbBusyContext);

  if (!context) {
    throw new Error('usePhvbBusy must be used within PhvbBusyProvider.');
  }

  return context;
}
