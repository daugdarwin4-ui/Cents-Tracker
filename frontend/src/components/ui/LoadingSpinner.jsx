import { memo } from 'react';

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-2',
  xl: 'h-14 w-14 border-[3px]',
};

const LoadingSpinner = memo(function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`inline-block rounded-full border-dark-50 border-t-primary-500 animate-spin
                  ${SIZE_CLASSES[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
});

export default LoadingSpinner;
