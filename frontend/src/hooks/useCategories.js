import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useCategories(type = null) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('categories')
        .select('*, parent:parent_id(id, name, color)')
        .eq('user_id', user.id)
        .order('name');

      if (type) query = query.eq('type', type);

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      setCategories(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(
    async (payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          name: payload.name.trim(),
          type: payload.type,
          color: payload.color || '#22c55e',
          parent_id: payload.parent_id || null,
          is_default: false,
        })
        .select('*, parent:parent_id(id, name, color)')
        .single();

      if (!error) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { data, error };
    },
    [user]
  );

  const updateCategory = useCallback(
    async (id, payload) => {
      if (!user) return { error: 'Not authenticated' };

      const updates = {};
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.color !== undefined) updates.color = payload.color;
      if ('parent_id' in payload) updates.parent_id = payload.parent_id || null;

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*, parent:parent_id(id, name, color)')
        .single();

      if (!error) setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      return { data, error };
    },
    [user]
  );

  const deleteCategory = useCallback(
    async (id) => {
      if (!user) return { error: 'Not authenticated' };

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
      return { error };
    },
    [user]
  );

  /** Returns the number of non-deleted transactions using this category. */
  const getCategoryUsage = useCallback(
    async (id) => {
      if (!user) return { count: 0 };
      const { count, error } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('user_id', user.id)
        .eq('is_deleted', false);
      return { count: count || 0, error };
    },
    [user]
  );

  return { categories, loading, error, refetch: fetchCategories, addCategory, updateCategory, deleteCategory, getCategoryUsage };
}
