import { memo } from 'react';

const VARIANTS = {
  income: 'badge-income',
  expense: 'badge-expense',
  investment: 'badge-investment',
  savings: 'badge-savings',
  default: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-50 text-gray-400',
};

const Badge = memo(function Badge({ label, variant = 'default', className = '' }) {
  const cls = VARIANTS[variant] || VARIANTS.default;
  return <span className={`${cls} ${className}`}>{label}</span>;
});

export default Badge;
