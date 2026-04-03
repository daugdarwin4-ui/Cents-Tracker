import { forwardRef, memo } from 'react';

const Input = memo(
  forwardRef(function Input(
    { label, error, helper, className = '', containerClassName = '', ...props },
    ref
  ) {
    return (
      <div className={`flex flex-col gap-1 ${containerClassName}`}>
        {label && (
          <label className="label" htmlFor={props.id || props.name}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`input-field ${error ? 'border-red-700 focus:ring-red-700 focus:border-red-700' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
        {helper && !error && <p className="text-xs text-gray-500 mt-0.5">{helper}</p>}
      </div>
    );
  })
);

export default Input;
