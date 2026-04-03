import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import Badge from '../ui/Badge';
import LoadingSpinner from '../ui/LoadingSpinner';

const TYPE_ICONS = {
  income: <ArrowUpRight size={14} className="text-primary-400" />,
  expense: <ArrowDownRight size={14} className="text-red-400" />,
  investment: <TrendingUp size={14} className="text-blue-400" />,
  savings: <PiggyBank size={14} className="text-yellow-400" />,
};

const RecentTransactions = memo(function RecentTransactions({ transactions, loading }) {
  const recent = useMemo(() => transactions.slice(0, 8), [transactions]);

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Transactions</h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
        <Link
          to="/transactions"
          className="text-xs text-primary-500 hover:text-primary-400 transition-colors"
        >
          View all →
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No transactions yet.</p>
          <Link to="/transactions" className="text-xs text-primary-500 hover:underline mt-1 block">
            Add your first transaction
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-dark-50">
          {recent.map((tx) => (
            <li key={tx.id} className="flex items-center gap-3 py-2.5 group">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-dark-100 flex items-center justify-center">
                {TYPE_ICONS[tx.type]}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">
                  {tx.note || tx.categories?.name || tx.type}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(tx.date)}
                  {tx.categories?.name && ` · ${tx.categories.name}`}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p
                  className={`text-sm font-medium ${
                    tx.type === 'income'
                      ? 'text-primary-400'
                      : tx.type === 'expense'
                      ? 'text-red-400'
                      : tx.type === 'investment'
                      ? 'text-blue-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </p>
                <Badge variant={tx.type} label={tx.type} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default RecentTransactions;
