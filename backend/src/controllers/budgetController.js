const supabase = require('../config/supabase');
const { toCents } = require('../utils/currency');

exports.list = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    let query = supabase
      .from('budgets')
      .select('*, categories(id, name, type, color)')
      .eq('user_id', req.userId);

    if (month) query = query.eq('month', Number(month));
    if (year) query = query.eq('year', Number(year));

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const { category_id, amount, month, year } = req.body;

    if (!category_id || !amount || !month || !year) {
      return res.status(400).json({ error: 'category_id, amount, month, and year are required' });
    }

    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          user_id: req.userId,
          category_id,
          amount: amountCents,
          month: Number(month),
          year: Number(year),
        },
        { onConflict: 'user_id,category_id,month,year' }
      )
      .select('*, categories(id, name, type, color)')
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
