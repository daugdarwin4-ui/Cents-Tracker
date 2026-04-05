const supabase = require('../config/supabase');
const { toCents } = require('../utils/currency');

/**
 * Normalise text for fuzzy matching.
 */
function normalise(text) {
  return (text || '').toLowerCase().trim();
}

/**
 * Decide whether a transaction matches a checklist item.
 * Rules (any one is sufficient):
 *  1. Same category_id
 *  2. Item title found in transaction note
 *  3. Any auto_match_keyword found in transaction note
 *  4. Transaction category name contains a meaningful word from the item title
 */
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

// ── GET /api/checklists ───────────────────────────────────
exports.list = async (req, res, next) => {
  try {
    const { month, year, status } = req.query;

    let query = supabase
      .from('checklist_items')
      .select('*, categories(id, name, type, color)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true });

    if (month) query = query.eq('month', Number(month));
    if (year) query = query.eq('year', Number(year));
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/checklists ──────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { title, category_id, expected_amount, due_date, month, year, auto_match_keywords, notes } =
      req.body;

    if (!title || !month || !year) {
      return res.status(400).json({ error: 'title, month, and year are required' });
    }
    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    const insertData = {
      user_id: req.userId,
      title: title.trim(),
      category_id: category_id || null,
      expected_amount: expected_amount ? toCents(expected_amount) : null,
      due_date: due_date || null,
      month: Number(month),
      year: Number(year),
      status: 'pending',
      auto_match_keywords: Array.isArray(auto_match_keywords) ? auto_match_keywords : [],
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('checklist_items')
      .insert(insertData)
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/checklists/:id ───────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category_id, expected_amount, due_date, month, year, auto_match_keywords, notes } =
      req.body;

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (expected_amount !== undefined)
      updates.expected_amount = expected_amount ? toCents(expected_amount) : null;
    if (due_date !== undefined) updates.due_date = due_date || null;
    if (month !== undefined) updates.month = Number(month);
    if (year !== undefined) updates.year = Number(year);
    if (auto_match_keywords !== undefined)
      updates.auto_match_keywords = Array.isArray(auto_match_keywords) ? auto_match_keywords : [];
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Item not found' });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/checklists/:id ────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/checklists/:id/toggle ─────────────────────
exports.toggle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: current, error: fetchErr } = await supabase
      .from('checklist_items')
      .select('status')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchErr || !current) return res.status(404).json({ error: 'Item not found' });

    const newStatus = current.status === 'paid' ? 'pending' : 'paid';
    const updates = {
      status: newStatus,
      ...(newStatus === 'pending' ? { linked_transaction_id: null } : {}),
    };

    const { data, error } = await supabase
      .from('checklist_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/checklists/auto-match-transaction ───────────
exports.autoMatchTransaction = async (req, res, next) => {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ error: 'transaction_id is required' });

    // Fetch the transaction
    const { data: transaction, error: txErr } = await supabase
      .from('transactions')
      .select('*, categories(id, name, type, color)')
      .eq('id', transaction_id)
      .eq('user_id', req.userId)
      .single();

    if (txErr || !transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.type !== 'expense') return res.json({ matched: 0 });

    const txDate = new Date(transaction.date);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();

    // Fetch pending checklist items for same month/year
    const { data: pendingItems, error: listErr } = await supabase
      .from('checklist_items')
      .select('*, categories(id, name, type, color)')
      .eq('user_id', req.userId)
      .eq('status', 'pending')
      .eq('month', txMonth)
      .eq('year', txYear);

    if (listErr || !pendingItems?.length) return res.json({ matched: 0 });

    const matched = pendingItems.filter((item) => transactionMatchesItem(transaction, item));
    if (!matched.length) return res.json({ matched: 0 });

    const ids = matched.map((m) => m.id);
    const { error: updateErr } = await supabase
      .from('checklist_items')
      .update({ status: 'paid', linked_transaction_id: transaction.id })
      .in('id', ids)
      .eq('user_id', req.userId);

    if (updateErr) throw updateErr;

    res.json({ matched: ids.length, updated_ids: ids });
  } catch (err) {
    next(err);
  }
};
