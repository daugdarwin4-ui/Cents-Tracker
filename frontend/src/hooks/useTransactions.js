import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toCents } from '../utils/currency';
import { runChecklistAutoMatch } from '../utils/checklistMatcher';

/**
 * Hook for managing transactions.
 * @param {object} filters - { type, startDate, endDate, search }
 */
export function useTransactions(filters = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const f = filtersRef.current;
      let query = supabase
        .from('transactions')
        .select('*, categories(id, name, type, color)', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order(f.sortBy || 'date', { ascending: f.sortOrder === 'asc' });

      if (f.type) query = query.eq('type', f.type);
      if (f.startDate) query = query.gte('date', f.startDate);
      if (f.endDate) query = query.lte('date', f.endDate);
      if (f.categoryId) query = query.eq('category_id', f.categoryId);
      if (f.search) {
        query = query.or(`note.ilike.%${f.search}%,account_name.ilike.%${f.search}%`);
      }

      const { data, error: qErr, count: total } = await query;
      if (qErr) throw qErr;

      setTransactions(data || []);
      setCount(total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [
    fetchTransactions,
    filters.type,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.categoryId,
    filters.sortBy,
    filters.sortOrder,
  ]);

  const addTransaction = useCallback(
    async (payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: toCents(payload.amount),
          type: payload.type,
          category_id: payload.category_id || null,
          date: payload.date,
          note: payload.note || null,
          payment_method: payload.payment_method || null,
          account_name: payload.account_name || null,
        })
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) {
        setTransactions((prev) => [data, ...prev]);
        setCount((c) => c + 1);
        // Auto-match against pending checklist items (best-effort, fire-and-forget)
        runChecklistAutoMatch(user.id, data);
      }
      return { data, error };
    },
    [user]
  );

  const updateTransaction = useCallback(
    async (id, payload) => {
      if (!user) return { error: 'Not authenticated' };

      const updates = { ...payload };
      if (payload.amount !== undefined) {
        updates.amount = toCents(payload.amount);
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) {
        setTransactions((prev) => prev.map((t) => (t.id === id ? data : t)));
      }
      return { data, error };
    },
    [user]
  );

  /**
   * Soft-delete a transaction (sets is_deleted = true).
   * Caller is responsible for the undo logic.
   */
  const softDeleteTransaction = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('transactions')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        setCount((c) => c - 1);
      }
      return { error };
    },
    [user]
  );

  const restoreTransaction = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('transactions')
        .update({ is_deleted: false })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error && data) {
        setTransactions((prev) => [data, ...prev]);
        setCount((c) => c + 1);
      }
      return { data, error };
    },
    [user]
  );

  return {
    transactions,
    loading,
    error,
    count,
    refetch: fetchTransactions,
    addTransaction,
    updateTransaction,
    softDeleteTransaction,
    restoreTransaction,
  };
}

/**
 * Returns aggregated summary for a given month/year.
 */
export function useMonthlySummary(month, year) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetch() {
      setLoading(true);

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Monthly
      const { data: monthly } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .gte('date', startDate)
        .lte('date', endDate);

      // All-time for balance
      const { data: allTime } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('is_deleted', false);

      const sumByType = (rows) =>
        (rows || []).reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + Number(r.amount);
          return acc;
        }, {});

      const m = sumByType(monthly);
      const a = sumByType(allTime);

      const totalBalance =
        (a.income || 0) - (a.expense || 0) - (a.investment || 0) - (a.savings || 0);

      setSummary({
        totalBalance,
        income: m.income || 0,
        expense: m.expense || 0,
        investment: m.investment || 0,
        savings: m.savings || 0,
      });

      setLoading(false);
    }

    fetch();
  }, [user, month, year]);

  return { summary, loading };
}
