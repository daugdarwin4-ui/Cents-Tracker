const supabase = require('../config/supabase');
const { generateCSV } = require('../utils/csvExport');
const { fromCents } = require('../utils/currency');

/**
 * GET /api/reports/summary
 * Returns totals for a given month/year
 */
exports.summary = async (req, res, next) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
    } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Monthly totals
    const { data: monthly, error: monthlyError } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .gte('date', startDate)
      .lte('date', endDate);

    if (monthlyError) throw monthlyError;

    // All-time totals for balance
    const { data: allTime, error: allTimeError } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', req.userId)
      .eq('is_deleted', false);

    if (allTimeError) throw allTimeError;

    const sumByType = (rows) =>
      rows.reduce((acc, row) => {
        acc[row.type] = (acc[row.type] || 0) + Number(row.amount);
        return acc;
      }, {});

    const monthlyTotals = sumByType(monthly);
    const allTimeTotals = sumByType(allTime);

    const totalBalance =
      (allTimeTotals.income || 0) -
      (allTimeTotals.expense || 0) -
      (allTimeTotals.investment || 0) -
      (allTimeTotals.savings || 0);

    res.json({
      data: {
        totalBalance,
        monthly: {
          income: monthlyTotals.income || 0,
          expense: monthlyTotals.expense || 0,
          investment: monthlyTotals.investment || 0,
          savings: monthlyTotals.savings || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/monthly
 * Full monthly report including category breakdown
 */
exports.monthly = async (req, res, next) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
    } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(id, name, type, color)')
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

    // Aggregate by type
    const totals = { income: 0, expense: 0, investment: 0, savings: 0 };
    const categoryMap = {};

    for (const tx of data) {
      totals[tx.type] = (totals[tx.type] || 0) + Number(tx.amount);

      if (tx.categories) {
        const key = tx.categories.name;
        if (!categoryMap[key]) {
          categoryMap[key] = {
            name: key,
            type: tx.type,
            color: tx.categories.color,
            total: 0,
          };
        }
        categoryMap[key].total += Number(tx.amount);
      }
    }

    const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const bestCategory = categories.filter((c) => c.type === 'income')[0] || null;
    const worstCategory = categories.filter((c) => c.type === 'expense').sort((a, b) => b.total - a.total)[0] || null;

    const remaining =
      totals.income - totals.expense - totals.investment - totals.savings;

    res.json({
      data: {
        period: { month: Number(month), year: Number(year), startDate, endDate },
        totals,
        remaining,
        bestCategory,
        worstCategory,
        categoryBreakdown: categories,
        transactions: data,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/yearly
 * Month-by-month breakdown for a year
 */
exports.yearly = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data, error } = await supabase
      .from('transactions')
      .select('date, type, amount')
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw error;

    // Build month-by-month summary
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      investment: 0,
      savings: 0,
    }));

    for (const tx of data) {
      const m = new Date(tx.date).getMonth(); // 0-indexed
      months[m][tx.type] = (months[m][tx.type] || 0) + Number(tx.amount);
    }

    res.json({ data: months });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/export/transactions
 * CSV export of transactions
 */
exports.exportTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;

    let query = supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    const columns = [
      { label: 'Date', value: (r) => r.date },
      { label: 'Type', value: (r) => r.type },
      { label: 'Category', value: (r) => r.categories?.name || '' },
      { label: 'Amount (USD)', value: (r) => fromCents(r.amount).toFixed(2) },
      { label: 'Note', value: (r) => r.note || '' },
      { label: 'Payment Method', value: (r) => r.payment_method || '' },
      { label: 'Account', value: (r) => r.account_name || '' },
    ];

    const csv = generateCSV(data, columns);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cents-tracker-transactions-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/export/monthly
 * CSV export of a monthly report
 */
exports.exportMonthly = async (req, res, next) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
    } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('user_id', req.userId)
      .eq('is_deleted', false)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

    const columns = [
      { label: 'Date', value: (r) => r.date },
      { label: 'Type', value: (r) => r.type },
      { label: 'Category', value: (r) => r.categories?.name || '' },
      { label: 'Amount (USD)', value: (r) => fromCents(r.amount).toFixed(2) },
      { label: 'Note', value: (r) => r.note || '' },
      { label: 'Payment Method', value: (r) => r.payment_method || '' },
    ];

    const csv = generateCSV(data, columns);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cents-tracker-monthly-${year}-${String(month).padStart(2, '0')}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
