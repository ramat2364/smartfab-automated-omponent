'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#080B13] text-white min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg glass-card rounded-2xl p-8 border border-red-500/40 text-center space-y-6 shadow-2xl">
          <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full border border-red-500/30 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Application Exception Caught</h1>
            <p className="text-xs text-gray-400 mt-1">{error.message || 'An unhandled global exception occurred.'}</p>
          </div>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Application State</span>
          </button>
        </div>
      </body>
    </html>
  );
}
