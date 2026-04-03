const supabase = require('../config/supabase');
const { toCents } = require('../utils/currency');

exports.list = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    let query = supabase
      .from('investments')
      .select('*')
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, type, amount, date, notes } = req.body;

    if (!name || !amount || !date) {
      return res.status(400).json({ error: 'name, amount, and date are required' });
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const { data, error } = await supabase
      .from('investments')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        type: type || 'general',
        amount: amountCents,
        date,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, amount, date, notes } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) {
      const amountCents = toCents(amount);
      if (amountCents <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });
      updates.amount = amountCents;
    }
    if (date !== undefined) updates.date = date;
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabase
      .from('investments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Investment not found' });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
