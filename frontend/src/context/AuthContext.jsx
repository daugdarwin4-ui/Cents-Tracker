import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary', type: 'income', color: '#22c55e', is_default: true },
  { name: 'Freelance', type: 'income', color: '#16a34a', is_default: true },
  { name: 'Business', type: 'income', color: '#15803d', is_default: true },
  { name: 'Other Income', type: 'income', color: '#4ade80', is_default: true },
  // Expense
  { name: 'Food & Dining', type: 'expense', color: '#22c55e', is_default: true },
  { name: 'Transportation', type: 'expense', color: '#16a34a', is_default: true },
  { name: 'Housing', type: 'expense', color: '#15803d', is_default: true },
  { name: 'Utilities', type: 'expense', color: '#166534', is_default: true },
  { name: 'Healthcare', type: 'expense', color: '#4ade80', is_default: true },
  { name: 'Entertainment', type: 'expense', color: '#86efac', is_default: true },
  { name: 'Shopping', type: 'expense', color: '#22c55e', is_default: true },
  { name: 'Education', type: 'expense', color: '#16a34a', is_default: true },
  { name: 'Subscriptions', type: 'expense', color: '#15803d', is_default: true },
  { name: 'Other Expense', type: 'expense', color: '#166534', is_default: true },
  // Investment
  { name: 'Stocks', type: 'investment', color: '#22c55e', is_default: true },
  { name: 'Crypto', type: 'investment', color: '#16a34a', is_default: true },
  { name: 'Real Estate', type: 'investment', color: '#15803d', is_default: true },
  { name: 'Other Investment', type: 'investment', color: '#4ade80', is_default: true },
  // Savings
  { name: 'Emergency Fund', type: 'savings', color: '#22c55e', is_default: true },
  { name: 'Retirement', type: 'savings', color: '#16a34a', is_default: true },
  { name: 'Other Savings', type: 'savings', color: '#4ade80', is_default: true },
];

async function seedDefaultCategories(userId) {
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) return; // already seeded

  await supabase.from('categories').insert(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }))
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (!error && data.user) {
      // Seed default categories for new user
      setTimeout(() => seedDefaultCategories(data.user.id), 1000);
    }

    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const getToken = useCallback(() => {
    return session?.access_token ?? null;
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
