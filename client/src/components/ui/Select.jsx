import React from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ label, value, onChange, options, className = "", placeholder, error }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`flex h-10 w-full appearance-none rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 dark:text-white dark:bg-slate-800 transition-colors ${
          error
            ? 'border-red-500 focus:ring-red-500 text-red-900 dark:text-red-100'
            : 'border-slate-300 dark:border-slate-600 focus:ring-[#3194A0]'
        }`}
        style={!error ? { '--tw-ring-color': '#3194A0' } : {}}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className={`absolute right-3 top-3 h-4 w-4 pointer-events-none ${error ? 'text-red-500' : 'opacity-50'}`} />
    </div>
  </div>
);

export default Select;