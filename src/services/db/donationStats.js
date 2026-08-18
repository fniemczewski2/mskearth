import { useEffect, useState } from 'react';

import { supabase } from '../supabaseClient.js';

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
