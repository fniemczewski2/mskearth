import { useEffect, useState } from 'react';

import { supabase } from '../supabaseClient.js';

/**
 * Statystyki zbiorki.
 *
 * Wczesniej hook sciagal do przegladarki WSZYSTKIE wiersze tabeli donations
 * (razem z donor_email) i sumowal je w JS, a subskrypcja Realtime powodowala
 * pelne przeladowanie tabeli u kazdego otwartego uzytkownika po kazdej wplacie.
 *
 * Teraz: agregat liczy baza (widok donation_stats), do przegladarki ida trzy
 * liczby, a odswiezanie to jedno lekkie zapytanie na minute.
 */
export function useDonationStats({ pollMs = 60_000 } = {}) {
  const [state, setState] = useState({
    goalAmount: 10_000,
    currentAmount: 0,
    donorsCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase
        .from('donation_stats')
        .select('current_amount, donors_count, goal_amount')
        .maybeSingle();

      if (!active) return;

      if (error) {
        setState((s) => ({ ...s, loading: false, error: 'Nie udało się pobrać statystyk.' }));
        return;
      }

      setState({
        goalAmount: Number(data?.goal_amount) || 10_000,
        currentAmount: Number(data?.current_amount) || 0,
        donorsCount: Number(data?.donors_count) || 0,
        loading: false,
        error: null,
      });
    };

    load();
    const id = setInterval(load, pollMs);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollMs]);

  return state;
}
