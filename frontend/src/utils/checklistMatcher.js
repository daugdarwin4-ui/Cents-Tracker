import { supabase } from '../lib/supabase';

/** Normalise text for fuzzy matching. */
function normalise(text) {
  return (text || '').toLowerCase().trim();
}

/**
 * Returns true when a transaction should mark a checklist item as paid.
 * Rules (any one is sufficient):
 *  1. Same category_id
 *  2. Item title appears in transaction note
 *  3. Any auto_match_keyword appears in transaction note
 */
export function transactionMatchesItem(transaction, item) {
  if (
    item.category_id &&
    transaction.category_id &&
    item.category_id === transaction.category_id
  ) {
    return true;
  }

  const noteText = normalise(transaction.note);
  const titleText = normalise(item.title);

  if (titleText && noteText && noteText.includes(titleText)) return true;

  const keywords = Array.isArray(item.auto_match_keywords) ? item.auto_match_keywords : [];
  if (noteText && keywords.some((kw) => noteText.includes(normalise(kw)))) return true;

  return false;
}

/**
 * Auto-match an expense transaction against pending checklist items.
 * Updates matched items to 'paid' and stores the linked transaction id.
 * Returns the list of updated checklist item ids.
 */
export async function runChecklistAutoMatch(userId, transaction) {
  if (!userId || !transaction) return [];
  if (transaction.type !== 'expense') return [];

  try {
    const txDate = new Date(transaction.date);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();

    const { data: pending, error } = await supabase
      .from('checklist_items')
      .select('id, category_id, title, auto_match_keywords')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('month', txMonth)
      .eq('year', txYear);

    if (error || !pending?.length) return [];

    const matched = pending.filter((item) => transactionMatchesItem(transaction, item));
    if (!matched.length) return [];

    const ids = matched.map((m) => m.id);
    await supabase
      .from('checklist_items')
      .update({ status: 'paid', linked_transaction_id: transaction.id })
      .in('id', ids)
      .eq('user_id', userId);

    return ids;
  } catch (_) {
    return [];
  }
}
