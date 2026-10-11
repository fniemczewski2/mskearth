import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

import { supabase, checkIsAdmin } from '../../services/supabaseClient.js';
import SignInForm from './login.jsx';
import { DOMAIN_ERROR, isAllowedAdminEmail, isGoogleSession } from './allowedDomains.js';

export default function RequireAdmin({ children }) {
  const [state, setState] = useState({ status: 'loading', isAdmin: false, error: '' });

  useEffect(() => {
    let active = true;
    let seq = 0;
    let signingOut = false;

    // Liczy sie tylko wynik ostatniego sprawdzenia (np. wylogowanie w trakcie is_admin).
    const evaluate = async (session) => {
      const current = ++seq;
      if (!session) {
        if (active) setState((s) => ({ status: 'anon', isAdmin: false, error: s.error ?? '' }));
        return;
      }
      // Google: wpuszczamy tylko konta z domen organizacji (serwer blokuje to tez hookiem w Supabase).
      if (isGoogleSession(session) && !isAllowedAdminEmail(session.user?.email)) {
        if (active) setState({ status: 'anon', isAdmin: false, error: DOMAIN_ERROR });
        if (!signingOut) {
          signingOut = true;
          await supabase.auth.signOut();
          signingOut = false;
        }
        return;
      }
      const isAdmin = await checkIsAdmin();
      if (active && current === seq) setState({ status: 'ready', isAdmin, error: '' });
    };

    supabase.auth.getSession().then(({ data }) => evaluate(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Wywolania Supabase (rpc, signOut) poza callbackiem – w nim trzymana jest blokada sesji.
      setTimeout(() => evaluate(session), 0);
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
        <SignInForm initialError={state.error} />
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
