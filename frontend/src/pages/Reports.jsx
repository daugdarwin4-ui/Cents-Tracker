import { useState, useCallback, useMemo } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import MoneyFlowChart from '../components/charts/MoneyFlowChart';
import CategoryChart from '../components/charts/CategoryChart';
import TrendChart from '../components/charts/TrendChart';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../utils/currency';
import { getMonthName, getCurrentMonth, getCurrentYear, isoMonth } from '../utils/date';

const PERIODS = ['Monthly', 'Yearly'];

export default function Reports() {
  const { getToken } = useAuth();
  const { success, error: showError } = useToast();
  const [period, setPeriod] = useState('Monthly');
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());

  const dateFilters = useMemo(() => {
    if (period === 'Monthly') {
      const m = String(month).padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}` };
    }
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }, [period, month, year]);

  const { transactions, loading } = useTransactions({ ...dateFilters, sortBy: 'date', sortOrder: 'asc' });

  const summary = useMemo(() => {
    const totals = { income: 0, expense: 0, investment: 0, savings: 0 };
    for (const tx of transactions) totals[tx.type] = (totals[tx.type] || 0) + Number(tx.amount);
    return {
      ...totals,
      remaining: totals.income - totals.expense - totals.investment - totals.savings,
    };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    for (const tx of transactions) {
      if (!tx.categories || tx.type !== 'expense') continue;
      const k = tx.categories.name;
      if (!map[k]) map[k] = { name: k, value: 0, color: tx.categories.color };
      map[k].value += Number(tx.amount);
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const bestCategory = useMemo(() => {
    const incomeMap = {};
    for (const tx of transactions) {
      if (!tx.categories || tx.type !== 'income') continue;
      const k = tx.categories.name;
      incomeMap[k] = (incomeMap[k] || 0) + Number(tx.amount);
    }
    const entries = Object.entries(incomeMap).sort((a, b) => b[1] - a[1]);
    return entries[0] || null;
  }, [transactions]);

  const worstCategory = categoryBreakdown[0] || null;

  // Monthly trend data (for monthly view: daily; for yearly: monthly)
  const trendData = useMemo(() => {
    if (period === 'Monthly') {
      const lastDay = new Date(year, month, 0).getDate();
      return Array.from({ length: lastDay }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTx = transactions.filter((t) => t.date === dateStr);
        return {
          label: String(day),
          income: dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
          expense: dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
        };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const mStr = String(m).padStart(2, '0');
      const monthTx = transactions.filter((t) => t.date.startsWith(`${year}-${mStr}`));
      return {
        label: getMonthName(m, 'short'),
        income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      };
    });
  }, [transactions, period, month, year]);

  const navigatePrev = useCallback(() => {
    if (period === 'Monthly') {
      if (month === 1) { setMonth(12); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      setYear((y) => y - 1);
    }
  }, [period, month]);

  const navigateNext = useCallback(() => {
    if (period === 'Monthly') {
      if (month === 12) { setMonth(1); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    } else {
      setYear((y) => y + 1);
    }
  }, [period, month]);

  const handleExport = useCallback(async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({ month, year });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/export/monthly?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${year}-${String(month).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success('Report exported.');
    } catch {
      showError('Export failed. Is the backend running?');
    }
  }, [month, year, getToken, success, showError]);

  const periodLabel = period === 'Monthly'
    ? `${getMonthName(month)} ${year}`
    : String(year);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-dark-300 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                period === p
                  ? 'bg-primary-700 text-white font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-100 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-white min-w-[120px] text-center">{periodLabel}</span>
          <button
            onClick={navigateNext}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-100 transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <Button variant="secondary" icon={Download} size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Income', value: summary.income, color: 'text-primary-400' },
              { label: 'Total Expense', value: summary.expense, color: 'text-red-400' },
              { label: 'Total Investment', value: summary.investment, color: 'text-blue-400' },
              { label: 'Total Savings', value: summary.savings, color: 'text-yellow-400' },
              { label: 'Remaining', value: summary.remaining, color: summary.remaining >= 0 ? 'text-primary-400' : 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="card">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Best / Worst */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Top Income Category</p>
              <p className="text-sm font-medium text-primary-400">
                {bestCategory ? `${bestCategory[0]} — ${formatCurrency(bestCategory[1])}` : '—'}
              </p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-500 mb-1">Highest Spending Category</p>
              <p className="text-sm font-medium text-red-400">
                {worstCategory ? `${worstCategory.name} — ${formatCurrency(worstCategory.value)}` : '—'}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={trendData}
              lines={[
                { dataKey: 'income', name: 'Income', color: '#22c55e' },
                { dataKey: 'expense', name: 'Expense', color: '#374151' },
              ]}
              title={`Daily Trend — ${periodLabel}`}
            />
            <CategoryChart
              data={categoryBreakdown}
              title="Expense by Category"
              doughnut
            />
          </div>

          <MoneyFlowChart data={trendData} title="Income vs Expense" />
        </>
      )}
    </div>
  );
}
