import React from 'react';

const Input = ({ label, type = "text", value, onChange, placeholder, className = "", error, ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white transition-colors ${
        error 
          ? 'border-red-500 focus:ring-red-500 text-red-900 placeholder:text-red-300 dark:text-red-100' 
          : 'border-slate-300 dark:border-slate-600 focus:ring-[#3194A0]' 
      }`}
      style={!error ? { '--tw-ring-color': '#3194A0' } : {}}
      {...props}
    />
  </div>
);

export default Input;