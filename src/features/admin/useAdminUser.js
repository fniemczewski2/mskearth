import { useEffect, useState } from 'react';

import { supabase } from '../../services/supabaseClient.js';

/** Zalogowany uzytkownik panelu. Dostep do panelu sprawdza RequireAdmin, wiec tu wystarczy sama sesja. */
export default function useAdminUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}
