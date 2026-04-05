import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toCents } from '../utils/currency';
import { runChecklistAutoMatch } from '../utils/checklistMatcher';

export { runChecklistAutoMatch };

export function useChecklists(month, year) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('checklist_items')
        .select('*, categories(id, name, type, color)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (month) query = query.eq('month', month);
      if (year) query = query.eq('year', year);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, month, year]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          user_id: user.id,
          title: payload.title.trim(),
          category_id: payload.category_id || null,
          expected_amount: payload.expected_amount ? toCents(payload.expected_amount) : null,
          due_date: payload.due_date || null,
          month: Number(payload.month),
          year: Number(payload.year),
          status: 'pending',
          auto_match_keywords: payload.auto_match_keywords || [],
          notes: payload.notes || null,
        })
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) setItems((prev) => [...prev, data]);
      return { data, error };
    },
    [user]
  );

  const updateItem = useCallback(
    async (id, payload) => {
      if (!user) return { error: 'Not authenticated' };

      const updates = {
        title: payload.title.trim(),
        category_id: payload.category_id || null,
        due_date: payload.due_date || null,
        month: Number(payload.month),
        year: Number(payload.year),
        auto_match_keywords: payload.auto_match_keywords || [],
        notes: payload.notes || null,
      };
      if (payload.expected_amount !== undefined) {
        updates.expected_amount = payload.expected_amount ? toCents(payload.expected_amount) : null;
      }

      const { data, error } = await supabase
        .from('checklist_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
      return { data, error };
    },
    [user]
  );

  const deleteItem = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) setItems((prev) => prev.filter((item) => item.id !== id));
      return { error };
    },
    [user]
  );

  const toggleStatus = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const current = items.find((i) => i.id === id);
      if (!current) return { error: 'Item not found' };

      const newStatus = current.status === 'paid' ? 'pending' : 'paid';
      const updates = {
        status: newStatus,
        ...(newStatus === 'pending' ? { linked_transaction_id: null } : {}),
      };

      const { data, error } = await supabase
        .from('checklist_items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*, categories(id, name, type, color)')
        .single();

      if (!error) setItems((prev) => prev.map((item) => (item.id === id ? data : item)));
      return { data, error };
    },
    [user, items]
  );

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    addItem,
    updateItem,
    deleteItem,
    toggleStatus,
  };
}
