import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({ children, onClick, variant = 'primary', className = "", icon: Icon, disabled = false, loading = false, type = "button" }) => {
  const baseStyle = "flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#3194A0] text-white hover:opacity-90 focus:ring-[#3194A0]",
    outline: "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
    ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:border-red-900/50"
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
    >
      {loading ? <Loader2 size={18} className="animate-spin mr-2"/> : (Icon && <Icon size={18} className="mr-2" />)}
      {children}
    </button>
  );
};

export default Button;