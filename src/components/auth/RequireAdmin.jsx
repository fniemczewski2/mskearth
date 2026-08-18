import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { supabase, checkIsAdmin } from '../../services/supabaseClient.js';
import SignInForm from '../../pages/admin/login.jsx';

export default function RequireAdmin({ children }) {
  const [state, setState] = useState({ status: 'loading', isAdmin: false });

  useEffect(() => {
    let active = true;

    const evaluate = async (session) => {
      if (!session) {
        if (active) setState({ status: 'anon', isAdmin: false });
        return;
      }
      const isAdmin = await checkIsAdmin();
      if (active) setState({ status: 'ready', isAdmin });
    };

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <main className="adminPanel">
        <p role="status" aria-live="polite">Sprawdzanie uprawnień…</p>
      </main>
    );
  }

  if (state.status === 'anon') {
    return (
      <main className="adminPanel">
        <h1>Panel administracyjny</h1>
        <SignInForm />
      </main>
    );
  }

  if (!state.isAdmin) {
    return (
      <main className="adminPanel">
        <h1>Brak uprawnień</h1>
        <p role="alert">
          To konto nie ma uprawnień administratora. Jeśli to pomyłka, poproś o dodanie
          do listy administratorów.
        </p>
        <button
          type="button"
          className="primaryBtn"
          onClick={() => supabase.auth.signOut()}
        >
          Wyloguj
        </button>
      </main>
    );
  }

  return children;
}

RequireAdmin.propTypes = { children: PropTypes.node };
