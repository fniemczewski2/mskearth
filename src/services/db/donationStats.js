import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Custom hook to fetch and track donation statistics in real-time
 * @returns {Object} { goalAmount, currentAmount, donorsCount, loading, error }
 */
export function useDonationStats() {
  const [goalAmount, setGoalAmount] = useState(10000); // Default: 10,000 zł
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
        
        // Fetch all successful donations from Supabase
        const { data: donations, error: donationsError } = await supabase
          .from('donations')
          .select('amount, donor_email, created_at')
          .eq('status', 'completed');

        if (donationsError) throw donationsError;

        if (active && donations) {
          // Calculate total amount
          const total = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
          
          // Count unique donors by email
          const uniqueDonors = new Set(
            donations
              .map(d => d.donor_email)
              .filter(Boolean) // Remove null/undefined emails
          ).size;
          
          setCurrentAmount(total);
          setDonorsCount(uniqueDonors);
        }

        // Fetch current fundraising goal
        const { data: settings, error: settingsError } = await supabase
          .from('fundraising_settings')
          .select('goal_amount')
          .eq('active', true)
          .limit(1)
          .single();

        if (!settingsError && settings && active) {
          setGoalAmount(settings.goal_amount || 10000);
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

    // Set up real-time updates
    const channel = supabase
      .channel('donations_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'donations',
          filter: 'status=eq.completed' // Only trigger on completed donations
        },
        (payload) => {
          console.log('Donation update received:', payload);
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