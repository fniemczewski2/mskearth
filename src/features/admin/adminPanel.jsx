import { useState } from 'react';

import { supabase } from '../../services/supabaseClient.js';
import AdminPanelNav from './adminPanelNav.jsx';
import useAdminUser from './useAdminUser.js';
import './admin.css';

export default function AdminPanel() {
  const user = useAdminUser();
  const [statusMsg, setStatusMsg] = useState('');

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
        {displayName}
        <button className="logOutBtn primaryBtn" onClick={handleSignOut} type="button">
          Wyloguj
        </button>
      </section>

      <AdminPanelNav />
    </main>
  );
}
