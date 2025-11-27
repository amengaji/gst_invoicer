import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const types = {
    success: { icon: CheckCircle, styles: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200" },
    error: { icon: AlertCircle, styles: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200" },
    info: { icon: Info, styles: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200" }
  };

  const { icon: Icon, styles } = types[toast.type] || types.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300 ${styles} min-w-[300px]`}>
      <Icon size={20} className="shrink-0" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};