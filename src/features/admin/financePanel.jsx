import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../../services/supabaseClient.js';
import { useConfirm } from '../../shared/components/ConfirmDialog.jsx';
import { INTL_LOCALE } from '../../shared/config/site.js';

const FINANCE_URL = '/api/finance';
const STATUS_LABELS = { active: 'aktywna', past_due: 'nieudana płatność' };

const money = new Intl.NumberFormat(INTL_LOCALE.pl, { style: 'currency', currency: 'PLN' });
const day = new Intl.DateTimeFormat(INTL_LOCALE.pl, { dateStyle: 'medium' });

/** Zadanie do api/finance z tokenem zalogowanego administratora. */
async function financeRequest(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');

  const res = await fetch(`${FINANCE_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Błąd ${res.status}`);
  return body;
}

/** Panel finansow: saldo Stripe i wplaty cykliczne. Dane pochodza bezposrednio ze Stripe. */
export default function FinancePanel() {
  const { confirm, dialog } = useConfirm({ confirmLabel: 'Anuluj wpłatę', cancelLabel: 'Zostaw' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setErr('');
    try {
      setData(await financeRequest(q ? `?q=${encodeURIComponent(q)}` : ''));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    load(query.trim());
  };

  const handleCancel = async (row) => {
    const who = row.email ?? row.id;
    const question = `Anulować wpłatę cykliczną ${money.format(row.monthlyAmount)} / mies. (${who})? Stripe nie pobierze kolejnych płatności. Tej operacji nie można cofnąć.`;
    if (!(await confirm(question))) return;
    setBusyId(row.id);
    setErr('');
    try {
      await financeRequest('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', subscriptionId: row.id }),
      });
      await load(query.trim());
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const rows = data?.subscriptions ?? [];

  return (
    <div className="cms-page" aria-busy={loading ? 'true' : 'false'}>
      {dialog}
      {err && (
        <div className="cms-error" role="alert">
          {err}
        </div>
      )}

      <section className="cms-card">
        <h2 className="cms-heading">Saldo Stripe</h2>
        <dl className="finance-figures">
          <div>
            <dt>Dostępne</dt>
            <dd>{data ? money.format(data.balance.available) : '...'}</dd>
          </div>
          <div>
            <dt>W rozliczaniu</dt>
            <dd>{data ? money.format(data.balance.pending) : '...'}</dd>
          </div>
          <div>
            <dt>Wpłaty cykliczne / mies.</dt>
            <dd>{data ? money.format(data.monthlyTotal) : '...'}</dd>
          </div>
        </dl>
      </section>

      <section className="cms-card">
        <div className="cms-headingRow">
          <h2 className="cms-heading">Wpłaty cykliczne{data ? ` (${rows.length} z ${data.total})` : ''}</h2>
          <form className="finance-search" role="search" onSubmit={handleSearch}>
            <label className="sr-only" htmlFor="finance-search">
              Szukaj po adresie e-mail, imieniu lub identyfikatorze
            </label>
            <input
              id="finance-search"
              className="cms-input"
              type="search"
              placeholder="E-mail, imię lub ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="cms-btn">
              Szukaj
            </button>
          </form>
        </div>

        {loading && <p role="status">Wczytywanie danych ze Stripe...</p>}
        {!loading && rows.length === 0 && <p className="cms-empty">Brak wpłat cyklicznych.</p>}

        {rows.length > 0 && (
          <table className="cms-table">
            <thead>
              <tr>
                <th className="cms-th">Darczyńca</th>
                <th className="cms-th">Kwota / mies.</th>
                <th className="cms-th">Status</th>
                <th className="cms-th">Od</th>
                <th className="cms-th cms-th--right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="cms-td">
                    <div className="cms-strong">{row.email ?? '(brak adresu)'}</div>
                    {row.name && <div className="cms-muted">{row.name}</div>}
                  </td>
                  <td className="cms-td">{money.format(row.monthlyAmount)}</td>
                  <td className="cms-td">
                    {STATUS_LABELS[row.status] ?? row.status}
                    {row.cancelAtPeriodEnd && <div className="cms-muted">wygasa z końcem okresu</div>}
                  </td>
                  <td className="cms-td">{day.format(new Date(row.created))}</td>
                  <td className="cms-td">
                    <div className="cms-actions">
                      <button
                        type="button"
                        className="cms-btn cms-btnDanger"
                        onClick={() => handleCancel(row)}
                        aria-disabled={busyId === row.id ? 'true' : 'false'}
                      >
                        {busyId === row.id ? 'Anulowanie...' : 'Anuluj'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
