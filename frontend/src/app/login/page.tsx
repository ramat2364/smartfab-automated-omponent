'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Factory, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (e: React.MouseEvent, roleEmail: string) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setEmail(roleEmail);
      setPassword('password123');
      const success = await login(roleEmail, 'password123');
      if (!success) {
        setError('Quick login failed. Invalid credentials or server error.');
      }
    } catch (err) {
      setError('An error occurred during quick login.');
    } finally {
      setLoading(false);
    }
  };

  const quickRoles = [
    { title: 'CEO / Exec', email: 'ceo@smartfab.com', desc: 'Cross-plant KPI read-only access' },
    { title: 'Plant Head', email: 'head.pune@smartfab.com', desc: 'Full plant status & read other plants' },
    { title: 'Production Mgr', email: 'prod.mgr@smartfab.com', desc: 'Log shifts, view trends' },
    { title: 'Maintenance Eng', email: 'maint.eng@smartfab.com', desc: 'Alerts, telemetry, logs' },
    { title: 'Quality Eng', email: 'qual.eng@smartfab.com', desc: 'Log defects, inspect photo, RCA' },
    { title: 'Admin', email: 'admin@smartfab.com', desc: 'Manage users and machines' },
  ];

  return (
    <div className="min-h-screen bg-bg-base flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-brand-blue/5 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-cyan/5 blur-[150px]" />

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
        
        {/* Left Side: Brand Panel */}
        <div className="flex flex-col justify-between p-8 rounded-2xl bg-white border border-slate-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full blur-3xl" />
          
          <div>
            <div className="flex items-center space-x-3 mb-10">
              <div className="bg-brand-blue/10 p-2.5 rounded-xl border border-brand-blue/30">
                <Factory className="h-7 w-7 text-brand-blue" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-slate-900 leading-none tracking-wide">SMARTFAB</h1>
                <p className="text-[10px] text-brand-cyan font-bold tracking-wider">DIGITAL GATEWAY</p>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
              Digital Transformation <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
                Platform
              </span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
              Connect production lines, automate defect registration, track energy efficiency, and monitor machine telemetry across Chakan, Nashik, and Chennai.
            </p>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <p className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase mb-2">Powered by</p>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold">
              <span>Next.js</span>
              <span className="text-slate-300">•</span>
              <span>Postgres</span>
              <span className="text-slate-300">•</span>
              <span>BullMQ</span>
              <span className="text-slate-300">•</span>
              <span>Anthropic AI</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form & Quick login */}
        <div className="flex flex-col space-y-6">
          
          {/* Login Form Panel */}
          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-lg">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Account Login</h3>
            <p className="text-xs text-slate-500 mb-6">Enter your credentials to securely access your workspace.</p>

            {error && (
              <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs mb-4 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smartfab.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-blue text-sm rounded-lg pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Secure Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-blue text-sm rounded-lg pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-300 text-brand-blue focus:ring-0 bg-white" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="hover:text-slate-900 transition-colors">Forgot Password?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Login shortcuts */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Login (Developer sandbox)</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickRoles.map((role) => (
                <button
                  type="button"
                  key={role.email}
                  onClick={(e) => handleQuickLogin(e, role.email)}
                  disabled={loading}
                  className="flex flex-col items-start text-left p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all text-xs cursor-pointer group"
                >
                  <span className="font-bold text-slate-700 group-hover:text-brand-blue">{role.title}</span>
                  <span className="text-[10px] text-slate-400 truncate w-full">{role.desc}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
