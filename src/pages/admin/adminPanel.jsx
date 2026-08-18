import { useEffect, useState } from 'react';

import { supabase } from '../../services/supabaseClient.js';
import AdminPanelNav from './adminPanelNav.jsx';

/**
 * Panel administracyjny.
 *
 * Logowanie i kontrola uprawnien przeniesione do <RequireAdmin>
 * (src/components/auth/RequireAdmin.jsx). Ten komponent renderuje sie
 * dopiero wtedy, gdy is_admin() zwrocilo true.
 */
export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

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

  const handleSignOut = async () => {
    setStatusMsg('Wylogowywanie…');
    await supabase.auth.signOut();
    setStatusMsg('');
  };

  const displayName =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Użytkownik';

  return (
    <main className="adminPanel">
      <h1>Panel administracyjny</h1>

      <div role="status" aria-live="polite" className="status">
        {statusMsg}
      </div>

      <section className="sub-header">
        <h2>
          {displayName}
          <button className="logOutBtn primaryBtn" onClick={handleSignOut} type="button">
            Wyloguj
          </button>
        </h2>
      </section>

      <AdminPanelNav />
    </main>
  );
}
