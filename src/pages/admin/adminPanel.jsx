import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import DataForms from "./dataForms";

function AdminPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Hydrate session on mount
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    init();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      setAuthError("");
      setStatusMsg("");
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError("");
    setStatusMsg("Logowanie…");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setStatusMsg("Zalogowano.");
    } catch (err) {
      setAuthError(err?.message || "Błąd logowania.");
      setStatusMsg("");
    }
  };

  const handleGoogle = async (e) => {
    e.preventDefault();
    setAuthError("");
    setStatusMsg("Przekierowanie do Google…");
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      setAuthError(err?.message || "Błąd logowania przez Google.");
      setStatusMsg("");
    }
  };

  const handleSignOut = async () => {
    setStatusMsg("Wylogowywanie…");
    setAuthError("");
    try {
      await supabase.auth.signOut();
      setStatusMsg("Wylogowano.");
    } catch (err) {
      setAuthError("Błąd podczas wylogowywania.");
    }
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Użytkownik";

  return (
    <main className="adminPanel">
      <h1>Panel administracyjny</h1>

      {/* Status + errors for screen readers */}
      <div role="status" aria-live="polite" className="status">
        {loading ? "Ładowanie…" : statusMsg}
      </div>
      {authError && (
        <div role="alert" className="error">
          {authError}
        </div>
      )}

      {!user ? (
        <form
          className="loginForm"
          onSubmit={handleSignIn}
          aria-label="Logowanie administratora"
          noValidate
        >
          <h2>Zaloguj</h2>

          <label className="visually-hidden" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="loginBox"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            required
            aria-required="true"
            inputMode="email"
          />

          <label className="visually-hidden" htmlFor="password">
            Hasło
          </label>
          <input
            id="password"
            type="password"
            className="loginBox"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło"
            autoComplete="current-password"
            required
            aria-required="true"
          />

          <button
            type="submit"
            className="loginBtn primaryBtn"
            disabled={loading || !email || !password}
          >
            Zaloguj
          </button>

          <button
            type="button"
            className="oauthBtn"
            onClick={handleGoogle}
            disabled={loading}
          >
            Zaloguj przez Google
          </button>
        </form>
      ) : (
        <>
          <section className="sub-header">
            <h2>
              {displayName}
              <button
                className="logOutBtn primaryBtn"
                onClick={handleSignOut}
                type="button"
              >
                Wyloguj
              </button>
            </h2>
          </section>
          <DataForms currentUserName={displayName} />
        </>
      )}
    </main>
  );
}

export default AdminPanel;
