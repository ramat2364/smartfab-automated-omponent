'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Factory, Sparkles, AlertTriangle, ArrowRight, Loader2, BarChart3, Clock, ShieldCheck, Zap } from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();
  const { setSelectedPlantId } = usePlant();
  const router = useRouter();
  
  const [kpis, setKpis] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Summary States
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchExecData = async () => {
    try {
      setLoading(true);
      const [kpiRes, trendRes] = await Promise.all([
        apiFetch('/executive/kpi'),
        apiFetch('/executive/trends')
      ]);

      if (kpiRes.ok && trendRes.ok) {
        setKpis(await kpiRes.json());
        setTrends(await trendRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchExecData();
  }, [authLoading]);

  const handleGenerateAiSummary = async () => {
    try {
      setAiLoading(true);
      setAiSummary('');
      const res = await apiFetch('/executive/summary', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDrillDown = (plantId: string) => {
    // 1. Set global plant context filter
    setSelectedPlantId(plantId);
    // 2. Redirect to production overview
    router.push('/production');
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header with AI trigger */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Cross-Plant Executive Overview</h1>
            <p className="text-xs text-gray-400 mt-1">Multi-site performance indicators, consolidated OEE, and energy tariffs.</p>
          </div>
          
          <button
            onClick={handleGenerateAiSummary}
            disabled={aiLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue/90 hover:to-brand-cyan/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-cyan/10"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-white" />
                <span>Generate Weekly AI Executive Report</span>
              </>
            )}
          </button>
        </div>

        {/* AI Report Summary section */}
        {aiSummary && (
          <div className="glass-card rounded-xl p-6 border border-brand-cyan/35 bg-brand-cyan/5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-brand-cyan uppercase tracking-wider">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                <span>CTO AI Executive Report (Seeded context)</span>
              </div>
              <button
                onClick={() => setAiSummary('')}
                className="text-[10px] text-gray-500 hover:text-white font-semibold uppercase tracking-wider"
              >
                Clear Report
              </button>
            </div>
            {/* Render AI summary markdown */}
            <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line bg-gray-950/40 p-4 rounded-xl border border-gray-900">
              {aiSummary}
            </div>
          </div>
        )}

        {/* Cross-Plant KPI Cards (Pune vs Nashik vs Chennai side-by-side) */}
        <div>
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Manufacturing Site Performance Indicators (30d)</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {kpis.map((plant) => {
              return (
                <div
                  key={plant.plantId}
                  onClick={() => handleDrillDown(plant.plantId)}
                  className="glass-card rounded-xl p-6 border border-gray-800/80 hover:border-brand-blue/40 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Plant Head Details */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                          {plant.plantCode}
                        </span>
                        <h3 className="font-extrabold text-base text-white mt-2 group-hover:text-brand-blue transition-colors">
                          {plant.plantName}
                        </h3>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-semibold uppercase">OEE Rating</p>
                        <p className="text-xl font-extrabold text-brand-cyan">{plant.oee}%</p>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-gray-900 pt-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-brand-amber" />
                        <div>
                          <p className="text-[9px] text-gray-500 font-semibold uppercase">Downtime</p>
                          <p className="text-xs font-bold text-white">{plant.downtimeHours} hrs</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="h-4 w-4 text-brand-rose" />
                        <div>
                          <p className="text-[9px] text-gray-500 font-semibold uppercase">Scrap logged</p>
                          <p className="text-xs font-bold text-white">{plant.defectQuantity} pcs</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <Zap className="h-4 w-4 text-brand-cyan" />
                        <div>
                          <p className="text-[9px] text-gray-500 font-semibold uppercase">Total energy cost (EST.)</p>
                          <p className="text-xs font-bold text-white">₹{plant.energyCost.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-brand-blue font-bold tracking-wide uppercase mt-6 pt-3 border-t border-gray-900/60">
                    <span>Inspect Plant Operations (Drill-down)</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* OEE & downtime 90-day Trends chart */}
        <div className="glass-card rounded-xl p-6 border border-gray-800/80">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-brand-blue" />
            <span>90-Day OEE Comparison Trend (%)</span>
          </h3>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                <YAxis stroke="#9CA3AF" domain={[50, 100]} fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line type="monotone" dataKey="pune_oee" name="Pune Plant OEE" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="nashik_oee" name="Nashik Plant OEE" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="chennai_oee" name="Chennai Plant OEE" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
