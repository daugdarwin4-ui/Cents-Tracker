import { forwardRef, memo } from 'react';

const Select = memo(
  forwardRef(function Select({ label, error, options = [], placeholder, className = '', containerClassName = '', ...props }, ref) {
    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label className="label" htmlFor={props.id || props.name}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`input-field cursor-pointer ${
            error ? 'border-red-700 focus:ring-red-700' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
    );
  })
);

export default Select;
