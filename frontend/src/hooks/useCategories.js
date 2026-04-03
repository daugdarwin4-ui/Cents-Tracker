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
        .select('*')
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
          is_default: false,
        })
        .select()
        .single();

      if (!error) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return { data, error };
    },
    [user]
  );

  const updateCategory = useCallback(
    async (id, payload) => {
      if (!user) return { error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('categories')
        .update({ name: payload.name?.trim(), color: payload.color })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
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

  return { categories, loading, error, refetch: fetchCategories, addCategory, updateCategory, deleteCategory };
}
