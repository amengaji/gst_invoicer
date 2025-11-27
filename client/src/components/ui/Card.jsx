import React from 'react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

export default Card;