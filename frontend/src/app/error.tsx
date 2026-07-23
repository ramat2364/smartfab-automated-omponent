'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showStack, setShowStack] = useState(false);

  useEffect(() => {
    // Log the error to console and backend audit
    console.error('Next.js App Error Boundary Caught Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#080B13] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl glass-card rounded-2xl p-8 border border-red-500/30 shadow-2xl space-y-6">
        
        {/* Error Header Icon */}
        <div className="flex items-center space-x-3 text-red-400">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">System Component Exception</h2>
            <p className="text-xs text-gray-400 mt-0.5">A runtime exception occurred while rendering this operational view.</p>
          </div>
        </div>

        {/* Error Message Box */}
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-900 space-y-2 font-mono text-xs">
          <p className="font-bold text-red-400 flex items-center space-x-1.5">
            <Terminal className="h-3.5 w-3.5" />
            <span>{error.name || 'Runtime Exception'}</span>
          </p>
          <p className="text-gray-300 leading-relaxed bg-red-950/20 p-3 rounded-lg border border-red-900/30">
            {error.message || 'An unexpected JavaScript error occurred while rendering the view component.'}
          </p>
        </div>

        {/* Expandable Stack Trace */}
        {error.stack && (
          <div>
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>{showStack ? 'Hide Debug Call Stack' : 'Show Debug Call Stack'}</span>
              {showStack ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showStack && (
              <pre className="mt-2 bg-gray-950 p-3 rounded-lg border border-gray-900 text-[10px] text-gray-400 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-900">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-blue/10"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Render (Reset View)</span>
          </button>

          <Link
            href="/production"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Return to Safety (Production Dashboard)</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
