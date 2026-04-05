const supabase = require('../config/supabase');
const { toCents } = require('../utils/currency');

/** Normalise text for matching. */
function normalise(text) {
  return (text || '').toLowerCase().trim();
}

/** Returns true if transaction matches a checklist item using flexible rules. */
function transactionMatchesItem(transaction, item) {
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
 * Run auto-match for a newly created expense transaction.
 * Silently ignores errors to prevent disrupting the main flow.
 */
async function runAutoMatch(userId, transaction) {
  if (transaction.type !== 'expense') return;
  try {
    const txDate = new Date(transaction.date);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();

    const { data: pending } = await supabase
      .from('checklist_items')
      .select('id, category_id, title, auto_match_keywords')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('month', txMonth)
      .eq('year', txYear);

    if (!pending?.length) return;
    const matched = pending.filter((item) => transactionMatchesItem(transaction, item));
    if (!matched.length) return;

    await supabase
      .from('checklist_items')
      .update({ status: 'paid', linked_transaction_id: transaction.id })
      .in('id', matched.map((m) => m.id))
      .eq('user_id', userId);
  } catch (_) {
    // Auto-match is best-effort; never block the transaction response
  }
}

/**
 * GET /api/transactions
 * Supports query params: type, startDate, endDate, search, sortBy, sortOrder, limit, offset
 */
exports.list = async (req, res, next) => {
  try {
    const {
      type,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      limit = 100,
      offset = 0,
    } = req.query;

    const allowedSortFields = ['date', 'amount', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const ascending = sortOrder === 'asc';

    let query = supabase
      .from('transactions')
      .select('*, categories(id, name, type, color)', { count: 'exact' })
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .order(safeSortBy, { ascending })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (search) query = query.ilike('note', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data, count });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/transactions
 */
exports.create = async (req, res, next) => {
  try {
    const { amount, type, category_id, date, note, payment_method, account_name } = req.body;

    if (!amount || !type || !date) {
      return res.status(400).json({ error: 'amount, type, and date are required' });
    }

    const validTypes = ['income', 'expense', 'investment', 'savings'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.userId,
        amount: amountCents,
        type,
        category_id: category_id || null,
        date,
        note: note || null,
        payment_method: payment_method || null,
        account_name: account_name || null,
      })
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;

    // Fire-and-forget: auto-match against pending checklist items
    runAutoMatch(req.userId, data);

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/transactions/:id
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, type, category_id, date, note, payment_method, account_name } = req.body;

    const updates = {};
    if (amount !== undefined) {
      const amountCents = toCents(amount);
      if (amountCents <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
      updates.amount = amountCents;
    }
    if (type !== undefined) {
      const validTypes = ['income', 'expense', 'investment', 'savings'];
      if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid type' });
      updates.type = type;
    }
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (date !== undefined) updates.date = date;
    if (note !== undefined) updates.note = note || null;
    if (payment_method !== undefined) updates.payment_method = payment_method || null;
    if (account_name !== undefined) updates.account_name = account_name || null;

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Transaction not found' });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/transactions/:id/soft-delete
 */
exports.softDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/transactions/:id/restore
 */
exports.restore = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: false })
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/transactions/:id
 * Permanent delete. Only used after undo window expires.
 */
exports.hardDelete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
