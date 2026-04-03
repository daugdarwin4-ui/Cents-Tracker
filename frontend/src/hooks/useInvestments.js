import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toCents } from '../utils/currency';

export function useInvestments(month = null, year = null) {
  const { user } = useAuth();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (month && year) {
        const m = String(month).padStart(2, '0');
        const lastDay = new Date(year, month, 0).getDate();
        query = query
          .gte('date', `${year}-${m}-01`)
          .lte('date', `${year}-${m}-${String(lastDay).padStart(2, '0')}`);
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      setInvestments(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, month, year]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const addInvestment = useCallback(
    async (payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          name: payload.name.trim(),
          type: payload.investment_type || payload.type || 'general',
          amount: toCents(payload.amount),
          date: payload.date,
          notes: payload.notes || null,
        })
        .select()
        .single();

      if (!error) setInvestments((prev) => [data, ...prev]);
      return { data, error };
    },
    [user]
  );

  const updateInvestment = useCallback(
    async (id, payload) => {
      if (!user) return { error: 'Not authenticated' };

      const updates = { ...payload };
      if (payload.investment_type !== undefined) { updates.type = payload.investment_type; delete updates.investment_type; }
      if (payload.amount !== undefined) updates.amount = toCents(payload.amount);

      const { data, error } = await supabase
        .from('investments')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (!error) setInvestments((prev) => prev.map((i) => (i.id === id ? data : i)));
      return { data, error };
    },
    [user]
  );

  const deleteInvestment = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) setInvestments((prev) => prev.filter((i) => i.id !== id));
      return { error };
    },
    [user]
  );

  return {
    investments,
    loading,
    error,
    refetch: fetchInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
  };
}
