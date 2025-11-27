import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper for Tailwind classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const generateCSV = (data) => {
  if (!data || !data.length) return '';
  // Get headers
  const headers = Object.keys(data[0]).join(',');
  // Get rows
  const rows = data.map(obj => 
    Object.values(obj).map(val => {
      // Handle commas inside data by wrapping in quotes
      const stringVal = String(val);
      return `"${stringVal.replace(/"/g, '""')}"`; 
    }).join(',')
  ).join('\n');
  
  return `${headers}\n${rows}`;
};

export const getQuarter = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  if (month >= 4 && month <= 6) return 'Q1 (Apr-Jun)';
  if (month >= 7 && month <= 9) return 'Q2 (Jul-Sep)';
  if (month >= 10 && month <= 12) return 'Q3 (Oct-Dec)';
  return 'Q4 (Jan-Mar)';
};