'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Zap, Activity, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

type TabType = 'overview' | 'breakdown' | 'pat';

export default function EnergyPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [breakdownData, setBreakdownData] = useState<any[]>([]);
  const [patData, setPatData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnergyData = async () => {
    try {
      setLoading(true);
      const query = selectedPlantId ? `?plantId=${selectedPlantId}` : '';
      
      const [overRes, breakRes, patRes] = await Promise.all([
        apiFetch(`/energy/overview${query}`),
        apiFetch(`/energy/machines${query}`),
        apiFetch(`/energy/pat${query}`)
      ]);

      if (overRes.ok && breakRes.ok && patRes.ok) {
        setOverviewData(await overRes.json());
        setBreakdownData(await breakRes.json());
        setPatData(await patRes.json());
      }
    } catch (err) {
      console.error('Error fetching energy metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchEnergyData();
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

  const summary = overviewData?.summary || { totalKwh: 0, totalCost: 0, costPerUnitProduced: 0 };
  const trend = overviewData?.trend || [];

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header with selector tabs */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Energy Management</h1>
            <p className="text-xs text-gray-400 mt-1">Monitor power grids, rank heavy consumer machines, and track PAT efficiency targets.</p>
          </div>
          
          {/* Navigation Tab selection */}
          <div className="flex space-x-1 bg-gray-950 p-1 rounded-lg border border-gray-900 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-brand-blue text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview & Tariffs
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'breakdown' ? 'bg-brand-blue text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Machine Breakdown
            </button>
            <button
              onClick={() => setActiveTab('pat')}
              className={`px-4 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'pat' ? 'bg-brand-blue text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              PAT Scheme Compliance
            </button>
          </div>
        </div>

        {/* Tab content conditional rendering */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top row cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glass-card rounded-xl p-5 border-l-4 border-brand-blue">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Power Draw</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{summary.totalKwh.toLocaleString()} <span className="text-xs text-gray-500 font-normal">kWh</span></h3>
              </div>
              <div className="glass-card rounded-xl p-5 border-l-4 border-brand-cyan">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Accumulated Cost</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">₹{summary.totalCost.toLocaleString()}</h3>
              </div>
              <div className="glass-card rounded-xl p-5 border-l-4 border-brand-emerald">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Specific Energy Cost</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">₹{summary.costPerUnitProduced} <span className="text-xs text-gray-500 font-normal">/ unit produced</span></h3>
              </div>
            </div>

            {/* Consumption Trend Chart */}
            <div className="glass-card rounded-xl p-6 border border-gray-800/80">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6">Daily Consumption & Cost Tariffs</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                    <YAxis stroke="#3b82f6" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="kwh" name="Grid Consumption (kWh)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorKwh)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-gray-350 uppercase tracking-wider">Machinery Energy Rankings</h3>
            
            {breakdownData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Bar chart left */}
                <div className="lg:col-span-2 glass-card rounded-xl p-6 border border-gray-800/80">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Heavy power consumer assets (kWh, Last 7 Days)</h4>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={breakdownData.slice(0, 8)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                        <XAxis type="number" stroke="#9CA3AF" fontSize={9} />
                        <YAxis type="category" dataKey="machineCode" stroke="#9CA3AF" fontSize={9} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                        <Bar dataKey="kwh" name="Energy Draw" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* List Ranking right */}
                <div className="glass-card rounded-xl p-5 border border-gray-800/80 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-900 pb-3">Energy Leaderboard</h4>
                  
                  <div className="space-y-3">
                    {breakdownData.slice(0, 5).map((m: any, idx: number) => (
                      <div key={m.machineId} className="flex justify-between items-center bg-gray-950/40 p-2.5 rounded-lg border border-gray-900">
                        <div className="truncate pr-2">
                          <p className="text-xs font-bold text-white truncate">{m.machineName}</p>
                          <p className="text-[9px] text-gray-500 font-semibold">{m.machineCode} • {m.lineName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-brand-cyan">{m.kwh} kWh</p>
                          <p className="text-[10px] text-gray-500 font-medium">₹{m.cost.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center text-gray-500 font-medium">
                No machine energy readings registered.
              </div>
            )}
          </div>
        )}

        {activeTab === 'pat' && (
          <div className="space-y-6">
            
            {/* Regulatory Description block */}
            <div className="glass-card rounded-xl p-5 border border-brand-cyan/20 bg-brand-cyan/5 flex items-start space-x-3">
              <Zap className="h-5 w-5 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Indian Bureau of Energy Efficiency (BEE) PAT Compliance</h4>
                <p className="text-xs text-gray-300 leading-relaxed mt-1">
                  The Perform, Achieve, and Trade (PAT) scheme sets regulatory targets for Specific Energy Consumption (SEC) per ton/unit of output. Overachieving targets earns Energy Savings Certificates (ESCerts), which can be traded. Underachieving incurs compliance penalties.
                </p>
              </div>
            </div>

            {/* Compliance Table */}
            <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Plant location</th>
                    <th className="px-6 py-4 text-right">Production output (30d)</th>
                    <th className="px-6 py-4 text-right">Total Power (30d)</th>
                    <th className="px-6 py-4 text-right">Actual SEC (kWh/unit)</th>
                    <th className="px-6 py-4 text-right">Target SEC (kWh/unit)</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">ESCerts Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {patData.map((plant) => {
                    return (
                      <tr key={plant.plantId} className="hover:bg-gray-900/40 text-gray-300">
                        <td className="px-6 py-4 font-bold text-white">{plant.plantName}</td>
                        <td className="px-6 py-4 text-right">{plant.totalUnitsProduced.toLocaleString()} pcs</td>
                        <td className="px-6 py-4 text-right">{plant.totalKwh.toLocaleString()} kWh</td>
                        <td className="px-6 py-4 text-right text-white font-semibold">{plant.actualSec}</td>
                        <td className="px-6 py-4 text-right text-brand-blue font-semibold">{plant.targetSec}</td>
                        <td className="px-6 py-4 text-center">
                          {plant.compliant ? (
                            <span className="inline-flex items-center space-x-1 bg-brand-emerald/10 border border-brand-emerald/30 px-2 py-0.5 rounded text-[10px] text-brand-emerald font-bold uppercase">
                              <CheckCircle className="h-2.5 w-2.5" />
                              <span>COMPLIANT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-brand-rose/10 border border-brand-rose/30 px-2 py-0.5 rounded text-[10px] text-brand-rose font-bold uppercase">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>OVER LIMIT</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-brand-cyan font-bold">
                          {plant.savingsCertificates > 0 ? `+${plant.savingsCertificates} ESCerts` : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </DashboardShell>
  );
}
