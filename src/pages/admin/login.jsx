import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { supabase } from "../../services/supabaseClient";

function SignInForm({ onSignedIn } = {}) {
  const emailId = useId();
  const passwordId = useId();
  const statusId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  async function handleEmailPasswordSignIn(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus({ type: "loading", message: "Logowanie…" });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      setStatus({ type: "success", message: "Zalogowano." });
      setPassword("");
      if (typeof onSignedIn === "function") onSignedIn(data.session || null);
    } catch (err) {
      console.error("Sign-in error:", err);
      setStatus({
        type: "error",
        message: "Nieprawidłowe dane logowania lub błąd serwera.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus({ type: "loading", message: "Przekierowanie do Google…" });

    const redirectTo =
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_AUTH_CALLBACK_URL) ||
      process.env?.NEXT_PUBLIC_AUTH_CALLBACK_URL ||
      window.location.origin;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      console.error("OAuth error:", err);
      setStatus({
        type: "error",
        message: "Nie udało się rozpocząć logowania przez Google.",
      });
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && email.trim().length > 3 && password.length >= 6;

  return (
    <div className="login">
      <form
        className="loginContainer"
        onSubmit={handleEmailPasswordSignIn}
        noValidate
        aria-describedby={status.message ? statusId : undefined}
      >
        {/* Live status for SR users */}
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`formStatus ${
            status.type === "error"
              ? "is-error"
              : status.type === "success"
              ? "is-success"
              : ""
          }`}
        >
          {status.message}
        </p>

        <label className="sr-only" htmlFor={emailId}>
          E-mail
        </label>
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

        <label className="sr-only" htmlFor={passwordId}>
          Hasło
        </label>
        <input
          id={passwordId}
          type="password"
          className="loginBox"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          autoComplete="current-password"
          required
          minLength={6}
        />

        <button
          type="submit"
          className="loginBtn"
          disabled={!canSubmit}
          aria-busy={submitting ? "true" : "false"}
        >
          {submitting ? "Logowanie…" : "Zaloguj"}
        </button>

        <button
          type="button"
          className="loginBtn"
          onClick={handleGoogleSignIn}
          aria-label="Zaloguj przez Google"
          title="Zaloguj przez Google"
          disabled={submitting}
          aria-busy={submitting ? "true" : "false"}
        >
          <FontAwesomeIcon className="social-icon" icon={faGoogle} />
        </button>
      </form>
    </div>
  );
}

SignInForm.propTypes = {
  onSignedIn: (props, propName, componentName) => {
    const v = props[propName];
    if (v !== undefined && typeof v !== "function") {
      return new Error(
        `Invalid prop \`${propName}\` supplied to \`${componentName}\`. Expected a function.`
      );
    }
    return null;
  },
};

export default SignInForm;
