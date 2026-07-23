'use client';

import React from 'react';
import { Download } from 'lucide-react';

interface ReportExportProps {
  data: any[];
  filename: string;
  headers: { key: string; label: string }[];
}

export default function ReportExport({ data, filename, headers }: ReportExportProps) {
  const exportToCSV = () => {
    if (data.length === 0) return;

    // Create CSV header row
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    
    // Create CSV data rows
    const dataRows = data.map(row => {
      return headers.map(h => {
        let val = row[h.key];
        
        // Handle nested fields if key has dots (e.g. 'plant.name')
        if (h.key.includes('.')) {
          const parts = h.key.split('.');
          let temp = row;
          for (const p of parts) {
            temp = temp ? temp[p] : '';
          }
          val = temp;
        }

        // Clean value for CSV formatting
        if (val === undefined || val === null) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        
        const cleanVal = String(val).replace(/"/g, '""');
        return `"${cleanVal}"`;
      }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCSV}
      disabled={data.length === 0}
      className="flex items-center space-x-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-gray-300 transition-colors"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Export CSV</span>
    </button>
  );
}
