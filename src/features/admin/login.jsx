import { useEffect, useId, useState } from 'react';
import PropTypes from 'prop-types';

import { supabase } from '../../services/supabaseClient.js';
import { env } from '../../shared/config/env.js';
import { DOMAIN_ERROR } from './allowedDomains.js';
import './login.css';

/** Blad zwrocony przez Supabase/Google w adresie po przekierowaniu (?error=… lub #error=…). */
function readOAuthError() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = params.get('error') || hash.get('error');
  if (!code) return '';
  const description = params.get('error_description') || hash.get('error_description') || '';

  // Usuwamy parametry bledu z paska adresu, zeby nie wracaly po odswiezeniu.
  window.history.replaceState(null, '', window.location.pathname);

  if (code === 'access_denied' && !description) return 'Logowanie przez Google zostało anulowane.';
  if (/domen|domain|msk\.earth|fpmsk/i.test(description)) return DOMAIN_ERROR;
  return 'Nie udało się zalogować przez Google. Spróbuj ponownie.';
}

export default function SignInForm({ onSignedIn, initialError = '' }) {
  const emailId = useId();
  const passwordId = useId();
  const statusId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(() =>
    initialError ? { type: 'error', message: initialError } : { type: 'idle', message: '' }
  );
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    const message = readOAuthError();
    if (message) setStatus({ type: 'error', message });
  }, []);

  useEffect(() => {
    if (initialError) setStatus({ type: 'error', message: initialError });
  }, [initialError]);

  async function handleGoogleSignIn() {
    if (googleBusy) return;
    setGoogleBusy(true);
    setStatus({ type: 'loading', message: 'Przekierowanie do Google…' });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: env.authCallbackUrl ?? `${window.location.origin}/admin`,
        // Zawsze pokazuj wybor konta, zeby latwo przelaczyc sie na konto organizacji.
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      setGoogleBusy(false);
      setStatus({ type: 'error', message: 'Nie udało się rozpocząć logowania przez Google.' });
    }
  }

  async function handleEmailPasswordSignIn(e) {
    e.preventDefault();
    if (submitting) return;

    if (email.trim().length < 4 || password.length < 8) {
      setStatus({ type: 'error', message: 'Podaj e-mail i hasło (min. 8 znaków).' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: 'loading', message: 'Logowanie…' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      setStatus({ type: 'success', message: 'Zalogowano.' });
      setPassword('');
      onSignedIn?.(data.session ?? null);
    } catch {
      setStatus({ type: 'error', message: 'Nieprawidłowe dane logowania.' });
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="login">
      <form
        className="loginContainer"
        onSubmit={handleEmailPasswordSignIn}
        noValidate
        aria-describedby={status.message ? statusId : undefined}
      >
        <p
          id={statusId}
          role={status.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`formStatus ${
            status.type === 'error' ? 'is-error' : status.type === 'success' ? 'is-success' : ''
          }`}
        >
          {status.message}
        </p>

        <label className="sr-only" htmlFor={emailId}>E-mail</label>
        <input
          id={emailId}
          type="email"
          className="loginBox"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail"
          autoComplete="email"
          inputMode="email"
          required
        />

        <label className="sr-only" htmlFor={passwordId}>Hasło</label>
        <input
          id={passwordId}
          type="password"
          className="loginBox"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          autoComplete="current-password"
          required
          minLength={8}
        />

        <button
          type="submit"
          className="loginBtn"
          aria-disabled={submitting ? 'true' : 'false'}
          aria-busy={submitting ? 'true' : 'false'}
        >
          {submitting ? 'Logowanie…' : 'Zaloguj'}
        </button>

        <p className="loginDivider" aria-hidden="true"><span>lub</span></p>

        <button
          type="button"
          className="loginBtn loginBtn--google"
          onClick={handleGoogleSignIn}
          aria-disabled={googleBusy ? 'true' : 'false'}
          aria-busy={googleBusy ? 'true' : 'false'}
          aria-describedby={`${statusId}-google-hint`}
        >
          {googleBusy ? 'Przekierowanie…' : 'Zaloguj przez Google'}
        </button>
      </form>
    </div>
  );
}

SignInForm.propTypes = {
  onSignedIn: PropTypes.func,
  initialError: PropTypes.string,
};
