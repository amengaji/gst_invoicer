import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

const Pagination = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button 
          variant="outline" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          className="text-xs h-8 px-3"
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          className="text-xs h-8 px-3"
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex flex-1 items-center justify-between">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-400">
            Showing <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalItems)}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={16} />
          </button>
          
          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
             // Logic to show limited pages (e.g. 1, 2, ..., 10)
             if (
                 page === 1 || 
                 page === totalPages || 
                 (page >= currentPage - 1 && page <= currentPage + 1)
             ) {
                 return (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            currentPage === page 
                                ? 'bg-[#3194A0] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3194A0]' 
                                : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700'
                        }`}
                    >
                        {page}
                    </button>
                 );
             } else if (
                 page === currentPage - 2 || 
                 page === currentPage + 2
             ) {
                 return <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-400">...</span>;
             }
             return null;
          })}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;