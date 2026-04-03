const supabase = require('../config/supabase');
const { toCents } = require('../utils/currency');

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
