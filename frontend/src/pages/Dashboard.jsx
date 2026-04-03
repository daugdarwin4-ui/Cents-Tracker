import { useMemo, useState } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  PiggyBank,
  Plus,
} from 'lucide-react';
import { useTransactions, useMonthlySummary } from '../hooks/useTransactions';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/dashboard/StatCard';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import MoneyFlowChart from '../components/charts/MoneyFlowChart';
import CategoryChart from '../components/charts/CategoryChart';
import Button from '../components/ui/Button';
import TransactionForm from '../components/transactions/TransactionForm';
import { getCurrentMonth, getCurrentYear, getMonthName } from '../utils/date';

export default function Dashboard() {
  const { user } = useAuth();
  const now = useMemo(() => ({ month: getCurrentMonth(), year: getCurrentYear() }), []);
  const [showForm, setShowForm] = useState(false);

  const { transactions, loading: txLoading, refetch } = useTransactions({
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const { summary, loading: summaryLoading } = useMonthlySummary(now.month, now.year);

  // Build last-6-months bar chart data
  const barData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      let m = now.month - i;
      let y = now.year;
      if (m <= 0) { m += 12; y -= 1; }
      months.push({ month: m, year: y, label: getMonthName(m, 'short') });
    }

    return months.map(({ month, year, label }) => {
      const txInMonth = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
      const income = txInMonth.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txInMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { label, income, expense };
    });
  }, [transactions, now]);

  // Category breakdown (expenses this month)
  const categoryData = useMemo(() => {
    const thisMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getMonth() + 1 === now.month &&
        d.getFullYear() === now.year &&
        t.type === 'expense' &&
        t.categories
      );
    });

    const map = {};
    for (const tx of thisMonthTx) {
      const name = tx.categories.name;
      if (!map[name]) map[name] = { name, value: 0, color: tx.categories.color };
      map[name].value += Number(tx.amount);
    }
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [transactions, now]);

  const loading = txLoading || summaryLoading;

  return (
    <div className="space-y-6">
      {/* Greeting + Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-sm text-gray-500">Here&apos;s your financial overview for {getMonthName(now.month)} {now.year}</p>
        </div>
        <Button icon={Plus} onClick={() => setShowForm(true)}>
          Add Transaction
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard type="balance" value={summary?.totalBalance} icon={DollarSign} loading={loading} />
        <StatCard type="income" value={summary?.income} icon={ArrowUpRight} loading={loading} />
        <StatCard type="expense" value={summary?.expense} icon={ArrowDownRight} loading={loading} />
        <StatCard type="investment" value={summary?.investment} icon={TrendingUp} loading={loading} />
        <StatCard type="savings" value={summary?.savings} icon={PiggyBank} loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MoneyFlowChart data={barData} title="Money In vs Money Out (6 months)" />
        <CategoryChart
          data={categoryData}
          title="Expense Breakdown (this month)"
          doughnut
        />
      </div>

      {/* Recent Transactions */}
      <RecentTransactions transactions={transactions} loading={txLoading} />

      {/* Add Transaction Modal */}
      {showForm && (
        <TransactionForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
