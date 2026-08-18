import { useId, useState } from 'react';
import PropTypes from 'prop-types';

import { supabase } from '../../services/supabaseClient.js';

export default function SignInForm({ onSignedIn }) {
  const emailId = useId();
  const passwordId = useId();
  const statusId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });

  async function handleEmailPasswordSignIn(e) {
    e.preventDefault();
    if (submitting) return;

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

  const canSubmit = !submitting && email.trim().length > 3 && password.length >= 8;

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
          disabled={!canSubmit}
          aria-busy={submitting ? 'true' : 'false'}
        >
          {submitting ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}

SignInForm.propTypes = {
  onSignedIn: PropTypes.func,
};
