const supabase = require('../config/supabase');

const VALID_TYPES = ['income', 'expense', 'investment', 'savings'];

exports.list = async (req, res, next) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('categories')
      .select('*, parent:parent_id(id, name, color)')
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
    const { name, type, color, parent_id } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid category type' });
    }

    // Validate parent_id
    if (parent_id) {
      const { data: parent, error: parentErr } = await supabase
        .from('categories')
        .select('id, type, parent_id')
        .eq('id', parent_id)
        .eq('user_id', req.userId)
        .single();

      if (parentErr || !parent) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
      if (parent.type !== type) {
        return res.status(400).json({ error: 'Parent category must be the same type' });
      }
      if (parent.parent_id) {
        return res.status(400).json({ error: 'Cannot nest subcategories more than one level deep' });
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        type,
        color: color || '#22c55e',
        parent_id: parent_id || null,
        is_default: false,
      })
      .select('*, parent:parent_id(id, name, color)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A category with this name and type already exists' });
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
    const { name, color, parent_id } = req.body;

    // Prevent self-parent
    if (parent_id === id) {
      return res.status(400).json({ error: 'A category cannot be its own parent' });
    }

    // Validate parent_id if provided
    if (parent_id) {
      const { data: self } = await supabase
        .from('categories')
        .select('id, type')
        .eq('id', id)
        .eq('user_id', req.userId)
        .single();

      if (self) {
        const { data: parent, error: parentErr } = await supabase
          .from('categories')
          .select('id, type, parent_id')
          .eq('id', parent_id)
          .eq('user_id', req.userId)
          .single();

        if (parentErr || !parent) {
          return res.status(400).json({ error: 'Parent category not found' });
        }
        if (parent.type !== self.type) {
          return res.status(400).json({ error: 'Parent category must be the same type' });
        }
        if (parent.parent_id) {
          return res.status(400).json({ error: 'Cannot nest subcategories more than one level deep' });
        }
      }
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (color !== undefined) updates.color = color;
    if ('parent_id' in req.body) updates.parent_id = parent_id || null;

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select('*, parent:parent_id(id, name, color)')
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

    // Count active transactions using this category (informational)
    const { count: txCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('user_id', req.userId)
      .eq('is_deleted', false);

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true, unlinkedTransactions: txCount || 0 });
  } catch (err) {
    next(err);
  }
};
