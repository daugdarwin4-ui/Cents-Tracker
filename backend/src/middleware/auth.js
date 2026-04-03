const supabase = require('../config/supabase');

/**
 * Verifies the Bearer JWT from Supabase Auth.
 * Attaches req.user and req.userId on success.
 */
module.exports = async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing token' });
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: invalid token' });
  }

  req.user = user;
  req.userId = user.id;
  next();
};
