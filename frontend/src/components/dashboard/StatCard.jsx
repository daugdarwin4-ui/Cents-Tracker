import { memo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

const TYPE_CONFIG = {
  balance: {
    label: 'Total Balance',
    colorClass: 'text-primary-400',
    bgClass: 'bg-primary-950',
    borderClass: 'border-primary-900/40',
  },
  income: {
    label: 'Monthly Income',
    colorClass: 'text-primary-400',
    bgClass: 'bg-primary-950/50',
    borderClass: 'border-primary-900/30',
  },
  expense: {
    label: 'Monthly Expenses',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-900/30',
  },
  investment: {
    label: 'Monthly Investment',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-950/40',
    borderClass: 'border-blue-900/30',
  },
  savings: {
    label: 'Monthly Savings',
    colorClass: 'text-yellow-400',
    bgClass: 'bg-yellow-950/40',
    borderClass: 'border-yellow-900/30',
  },
};

const StatCard = memo(function StatCard({ type, value, change, icon: Icon, loading = false }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.balance;

  const renderChange = () => {
    if (change === undefined || change === null) return null;
    if (change > 0)
      return (
        <span className="flex items-center gap-1 text-xs text-primary-400">
          <TrendingUp size={12} /> +{change.toFixed(1)}%
        </span>
      );
    if (change < 0)
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <TrendingDown size={12} /> {change.toFixed(1)}%
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Minus size={12} /> 0%
      </span>
    );
  };

  return (
    <div className={`card border ${config.borderClass} ${config.bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {config.label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-32 bg-dark-50 rounded animate-pulse" />
          ) : (
            <p className={`mt-1 text-2xl font-bold ${config.colorClass} truncate`}>
              {formatCurrency(value || 0)}
            </p>
          )}
          {!loading && <div className="mt-1">{renderChange()}</div>}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 p-2.5 rounded-lg ${config.bgClass} border ${config.borderClass}`}>
            <Icon size={18} className={config.colorClass} />
          </div>
        )}
      </div>
    </div>
  );
});

export default StatCard;
