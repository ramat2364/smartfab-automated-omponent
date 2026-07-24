'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { Factory, Calendar, CheckCircle2, AlertTriangle, Clock, Percent } from 'lucide-react';
import Link from 'next/link';

export default function ProductionOverviewPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const fetchOverview = async () => {
      try {
        setLoading(true);
        const query = (selectedPlantId && selectedPlantId !== 'all') ? `?plantId=${selectedPlantId}` : '';
        const res = await apiFetch(`/production/overview${query}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching production overview:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [authLoading, selectedPlantId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  const summary = data?.summary || {
    unitsProduced: 0,
    targetUnits: 1,
    scrapCount: 0,
    downtimeMinutes: 0,
    oee: 0,
    availability: 0,
    performance: 0,
    quality: 0
  };

  const performancePercent = Math.min(100, Math.round((summary.unitsProduced / (summary.targetUnits || 1)) * 100));
  const scrapRate = summary.unitsProduced > 0 
    ? Math.round((summary.scrapCount / summary.unitsProduced) * 1000) / 10
    : 0;

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Production Overview</h1>
            <p className="text-xs text-gray-400 mt-1">Real-time production indicators, targets and line throughput.</p>
          </div>
          <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-400">
            <Calendar className="h-3.5 w-3.5 text-brand-blue" />
            <span>Today: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* OEE Gauge */}
          <div className="glass-card rounded-xl p-5 border-l-4 border-brand-cyan">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overall OEE</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{summary.oee}%</h3>
              </div>
              <div className="bg-brand-cyan/10 p-2 rounded-lg text-brand-cyan">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex space-x-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              <span className="text-brand-cyan">A: {summary.availability}%</span>
              <span>•</span>
              <span className="text-brand-blue">P: {summary.performance}%</span>
              <span>•</span>
              <span className="text-brand-emerald">Q: {summary.quality}%</span>
            </div>
          </div>

          {/* Units Produced */}
          <div className="glass-card rounded-xl p-5 border-l-4 border-brand-blue">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Produced vs Target</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{summary.unitsProduced} <span className="text-sm font-normal text-gray-500">/ {summary.targetUnits}</span></h3>
              </div>
              <div className="bg-brand-blue/10 p-2 rounded-lg text-brand-blue">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-900 rounded-full h-1.5">
                <div className="bg-brand-blue h-1.5 rounded-full" style={{ width: `${performancePercent}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                <span>Performance Index</span>
                <span>{performancePercent}%</span>
              </div>
            </div>
          </div>

          {/* Scrap Log */}
          <div className="glass-card rounded-xl p-5 border-l-4 border-brand-rose">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scrap Registered</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{summary.scrapCount} <span className="text-xs text-gray-500 font-normal">units</span></h3>
              </div>
              <div className="bg-brand-rose/10 p-2 rounded-lg text-brand-rose">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Defect Ratio</span>
              <span className={`font-bold ${scrapRate > 3.0 ? 'text-brand-rose' : 'text-brand-emerald'}`}>{scrapRate}%</span>
            </div>
          </div>

          {/* Downtime minutes */}
          <div className="glass-card rounded-xl p-5 border-l-4 border-brand-amber">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Line Downtime</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{summary.downtimeMinutes} <span className="text-xs text-gray-500 font-normal">mins</span></h3>
              </div>
              <div className="bg-brand-amber/10 p-2 rounded-lg text-brand-amber">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Availability Index</span>
              <span className="font-bold text-brand-amber">{summary.availability}%</span>
            </div>
          </div>
        </div>

        {/* Production Lines Section */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Production Line Status</h2>
          
          {data?.lineStats && data.lineStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.lineStats.map((line: any) => {
                const lineProgress = Math.min(100, Math.round((line.unitsProduced / (line.target || 1)) * 100));
                return (
                  <div key={line.lineId} className="glass-card rounded-xl p-6 hover:border-gray-800 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] bg-brand-blue/10 text-brand-blue border border-brand-blue/20 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            {line.lineCode}
                          </span>
                          <h3 className="text-base font-bold text-white mt-2">{line.lineName}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400">OEE</p>
                          <p className="text-lg font-extrabold text-brand-cyan">{line.oee}%</p>
                        </div>
                      </div>

                      {/* Line metrics comparison */}
                      <div className="grid grid-cols-3 gap-3 border-y border-gray-900 py-3 mb-4">
                        <div>
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Output</p>
                          <p className="text-sm font-bold text-white">{line.unitsProduced} <span className="text-[10px] text-gray-500 font-normal">pcs</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Scrap</p>
                          <p className="text-sm font-bold text-brand-rose">{line.scrapCount} <span className="text-[10px] text-gray-500 font-normal">pcs</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-semibold uppercase">Downtime</p>
                          <p className="text-sm font-bold text-brand-amber">{line.downtimeMinutes} <span className="text-[10px] text-gray-500 font-normal">min</span></p>
                        </div>
                      </div>

                      {/* Progress to target */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                          <span>Target Volume ({line.target} units)</span>
                          <span>{lineProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-900 rounded-full h-1.5">
                          <div className="bg-brand-blue h-1.5 rounded-full" style={{ width: `${lineProgress}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/production/line/${line.lineId}`}
                      className="w-full text-center py-2 bg-gray-900/60 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 rounded-lg transition-all mt-2"
                    >
                      View 30-Day Details & Trends
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card rounded-xl p-8 text-center text-gray-500 text-sm">
              No production records logged for today yet. Use Shift Entry to log units.
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
