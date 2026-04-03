-- ============================================
-- CENTS TRACKER — SEED DATA
-- Run AFTER schema.sql
-- No manual edits required — seeds all existing users automatically.
-- Safe to re-run: duplicates are skipped via ON CONFLICT DO NOTHING.
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN

  -- Loop over every registered user and seed default categories for each.
  -- Safe to re-run: ON CONFLICT DO NOTHING skips duplicates.
  FOR v_user_id IN SELECT id FROM auth.users LOOP

    -- ---- INCOME CATEGORIES ----
    INSERT INTO categories (user_id, name, type, color, is_default) VALUES
      (v_user_id, 'Salary',          'income', '#22c55e', TRUE),
      (v_user_id, 'Freelance',       'income', '#16a34a', TRUE),
      (v_user_id, 'Business',        'income', '#15803d', TRUE),
      (v_user_id, 'Investments',     'income', '#166534', TRUE),
      (v_user_id, 'Rental',          'income', '#14532d', TRUE),
      (v_user_id, 'Gifts',           'income', '#4ade80', TRUE),
      (v_user_id, 'Other Income',    'income', '#86efac', TRUE)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- ---- EXPENSE CATEGORIES ----
    INSERT INTO categories (user_id, name, type, color, is_default) VALUES
      (v_user_id, 'Food & Dining',   'expense', '#22c55e', TRUE),
      (v_user_id, 'Transportation',  'expense', '#16a34a', TRUE),
      (v_user_id, 'Housing',         'expense', '#15803d', TRUE),
      (v_user_id, 'Utilities',       'expense', '#166534', TRUE),
      (v_user_id, 'Healthcare',      'expense', '#14532d', TRUE),
      (v_user_id, 'Entertainment',   'expense', '#4ade80', TRUE),
      (v_user_id, 'Shopping',        'expense', '#86efac', TRUE),
      (v_user_id, 'Education',       'expense', '#22c55e', TRUE),
      (v_user_id, 'Insurance',       'expense', '#16a34a', TRUE),
      (v_user_id, 'Subscriptions',   'expense', '#15803d', TRUE),
      (v_user_id, 'Other Expense',   'expense', '#166534', TRUE)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- ---- INVESTMENT CATEGORIES ----
    INSERT INTO categories (user_id, name, type, color, is_default) VALUES
      (v_user_id, 'Stocks',          'investment', '#22c55e', TRUE),
      (v_user_id, 'Bonds',           'investment', '#16a34a', TRUE),
      (v_user_id, 'Crypto',          'investment', '#15803d', TRUE),
      (v_user_id, 'Real Estate',     'investment', '#166534', TRUE),
      (v_user_id, 'Mutual Funds',    'investment', '#4ade80', TRUE),
      (v_user_id, 'ETF',             'investment', '#86efac', TRUE),
      (v_user_id, 'Other Investment','investment', '#22c55e', TRUE)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- ---- SAVINGS CATEGORIES ----
    INSERT INTO categories (user_id, name, type, color, is_default) VALUES
      (v_user_id, 'Emergency Fund',  'savings', '#22c55e', TRUE),
      (v_user_id, 'Retirement',      'savings', '#16a34a', TRUE),
      (v_user_id, 'Vacation Fund',   'savings', '#15803d', TRUE),
      (v_user_id, 'Home Purchase',   'savings', '#166534', TRUE),
      (v_user_id, 'Other Savings',   'savings', '#4ade80', TRUE)
    ON CONFLICT (user_id, name, type) DO NOTHING;

  END LOOP;

END $$;
