const supabase = require('../config/supabase');

exports.list = async (req, res, next) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', req.userId)
      .order('name');

    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, type, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const validTypes = ['income', 'expense', 'investment', 'savings'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid category type' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        type,
        color: color || '#22c55e',
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Category already exists' });
      }
      throw error;
    }

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Category not found' });

    res.json({ data });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
