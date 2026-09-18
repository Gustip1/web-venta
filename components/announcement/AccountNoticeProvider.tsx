"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  ACCOUNT_NOTICE_SETTING_KEY,
  ACCOUNT_NOTICE_ACK_KEY,
  AccountNotice,
  DEFAULT_ACCOUNT_NOTICE,
  mergeAccountNotice,
} from '@/lib/accountNotice';

interface AccountNoticeState {
  notice: AccountNotice;
  /** El aviso está tapando la pantalla ahora mismo. */
  open: boolean;
  accept: () => void;
}

const AccountNoticeContext = createContext<AccountNoticeState>({
  notice: DEFAULT_ACCOUNT_NOTICE,
  open: false,
  accept: () => {},
});

/**
 * Estado del aviso emergente. Lo consume el popup y también PromoModal, que
 * espera a que el visitante acepte el aviso antes de mostrar su promo:
 * dos modales encimados no se leen.
 */
export function useAccountNotice() {
  return useContext(AccountNoticeContext);
}

// El layout raíz no se remonta al navegar, así que sin este refresco alguien
// con la pestaña abierta no se entera de que el dueño prendió o apagó el aviso.
const REFRESH_INTERVAL_MS = 60_000;

export function AccountNoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<AccountNotice>(DEFAULT_ACCOUNT_NOTICE);
  const [accepted, setAccepted] = useState(true); // hasta saber, no tapamos nada

  useEffect(() => {
    try {
      setAccepted(sessionStorage.getItem(ACCOUNT_NOTICE_ACK_KEY) === '1');
    } catch {
      setAccepted(false);
    }
  }, []);

  const fetchNotice = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', ACCOUNT_NOTICE_SETTING_KEY)
      .maybeSingle();
    setNotice(mergeAccountNotice(data?.value));
  }, []);

  useEffect(() => {
    fetchNotice();
    const interval = setInterval(fetchNotice, REFRESH_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotice();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNotice]);

  const accept = useCallback(() => {
    setAccepted(true);
    try {
      sessionStorage.setItem(ACCOUNT_NOTICE_ACK_KEY, '1');
    } catch {
      // Si el navegador bloquea sessionStorage el aviso vuelve a aparecer
      // en la próxima carga; molesta un poco, pero no rompe nada.
    }
  }, []);

  return (
    <AccountNoticeContext.Provider value={{ notice, open: notice.active && !accepted, accept }}>
      {children}
    </AccountNoticeContext.Provider>
  );
}
