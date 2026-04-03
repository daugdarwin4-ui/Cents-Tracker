import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toCents } from '../utils/currency';

export function useBudgets(month, year) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('budgets')
        .select('*, categories(id, name, type, color)')
        .eq('user_id', user.id);

      if (month) query = query.eq('month', month);
      if (year) query = query.eq('year', year);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      setBudgets(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const upsertBudget = useCallback(
    async (payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          {
            user_id: user.id,
            category_id: payload.category_id,
            amount: toCents(payload.amount),
            month: payload.month,
            year: payload.year,
          },
          { onConflict: 'user_id,category_id,month,year' }
        )
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) {
        setBudgets((prev) => {
          const idx = prev.findIndex((b) => b.id === data.id);
          return idx >= 0 ? prev.map((b, i) => (i === idx ? data : b)) : [...prev, data];
        });
      }
      return { data, error };
    },
    [user]
  );

  const deleteBudget = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) setBudgets((prev) => prev.filter((b) => b.id !== id));
      return { error };
    },
    [user]
  );

  return { budgets, loading, error, refetch: fetchBudgets, upsertBudget, deleteBudget };
}

/**
 * Fetches spending totals per category for a given month/year.
 * Used to show progress against budgets.
 */
export function useCategorySpending(month, year) {
  const { user } = useAuth();
  const [spending, setSpending] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetch() {
      setLoading(true);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      const map = {};
      for (const row of data || []) {
        if (row.category_id) {
          map[row.category_id] = (map[row.category_id] || 0) + Number(row.amount);
        }
      }
      setSpending(map);
      setLoading(false);
    }

    fetch();
  }, [user, month, year]);

  return { spending, loading };
}
