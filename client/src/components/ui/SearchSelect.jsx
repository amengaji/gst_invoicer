import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

const SearchSelect = ({ label, value, options = [], onChange }) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full relative">
      {/* LABEL */}
      {label && (
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 inline-block">
          {label}
        </label>
      )}

      {/* SELECT BOX WITH CHEVRON */}
      <div
        className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 cursor-pointer relative flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        {/* Selected Value */}
        <span className="text-sm text-slate-700 dark:text-slate-200">
          {value || "Select..."}
        </span>

        {/* Chevron Icon */}
        <ChevronDown
          size={18}
          className={`text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto shadow-lg">
          
          {/* SEARCH BAR */}
          <input
            className="w-full px-3 py-2 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-sm"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {/* OPTIONS */}
          {filtered.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setOpen(false);
                setSearch("");
              }}
              className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              {opt.label}
            </div>
          ))}

          {/* NO RESULT */}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">No results</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchSelect;
