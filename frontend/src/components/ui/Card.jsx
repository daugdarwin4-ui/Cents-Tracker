import { memo } from 'react';

const Card = memo(function Card({ children, className = '', hover = false, onClick }) {
  const cls = hover ? 'card-hover cursor-pointer' : 'card';
  return (
    <div className={`${cls} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
});

export default Card;
