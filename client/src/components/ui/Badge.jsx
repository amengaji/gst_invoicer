import React from 'react';

const Badge = ({ children, type = 'neutral' }) => {
  const styles = {
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200",
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200",
    primary: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200"
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.neutral}`}>
      {children}
    </span>
  );
};

export default Badge;