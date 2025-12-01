import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom hook to fetch and track donation statistics in real-time
 * @returns {Object} { goalAmount, currentAmount, donorsCount, loading, error }
 */
export function useDonationStats() {
  const [goalAmount, setGoalAmount] = useState(10000);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [donorsCount, setDonorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    
    const fetchDonationStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donor_email, status');

        if (donationsError) throw donationsError;

        if (active && donations) {
          const completedDonations = donations.filter(d => 
            d.status === 'completed' || 
            d.status === 'paid' || 
            d.status === 'succeeded'
          );


          const total = completedDonations.reduce((sum, d) => {
            const amount = typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount;
            return sum + (amount || 0);
          }, 0);
          
          const uniqueDonors = new Set(
            completedDonations
              .map(d => d.donor_email)
              .filter(email => email && email !== null)
          ).size;
          
          setCurrentAmount(total);
          setDonorsCount(uniqueDonors);
        }
        try {
          const { data: settings, error: settingsError } = await supabase
            .from('fundraising_settings')
            .select('goal_amount')
            .eq('active', true)
            .maybeSingle(); 

          if (!settingsError && settings?.goal_amount && active) {
            setGoalAmount(parseFloat(settings.goal_amount) || 10000);
          }
        } catch (settingsErr) {
          console.warn('Could not load settings, using default goal');
        }

      } catch (e) {
        console.error('Error fetching donation stats:', e);
        if (active) {
          setError(e.message || 'Failed to fetch donation statistics');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchDonationStats();

    const channel = supabase
      .channel('donations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'donations',
        },
        (payload) => {
          if (active) {
            fetchDonationStats();
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, []);

  return {
    goalAmount,
    currentAmount,
    donorsCount,
    loading,
    error
  };
}