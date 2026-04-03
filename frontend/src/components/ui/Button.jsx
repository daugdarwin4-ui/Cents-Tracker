import { memo } from 'react';
import LoadingSpinner from './LoadingSpinner';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'text-gray-400 hover:text-white hover:bg-dark-100 px-3 py-2 rounded-lg transition-all duration-150 focus:outline-none',
};

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

const Button = memo(function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  ...props
}) {
  const base = VARIANTS[variant] || VARIANTS.primary;
  // For primary/secondary/danger the size class overrides the padding from CSS class
  const sizeClass = variant !== 'ghost' ? SIZES[size] : '';

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-medium
                  ${base} ${sizeClass} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {!loading && Icon && iconPosition === 'left' && <Icon size={14} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={14} />}
    </button>
  );
});

export default Button;
