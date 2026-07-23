'use client';

import React, { useState, useEffect, use } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ArrowLeft, Factory, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function LineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const lineId = resolvedParams.id;
  
  const { apiFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLineDetail = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/production/line/${lineId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching line details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLineDetail();
  }, [lineId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  if (!data || !data.line) {
    return (
      <DashboardShell>
        <div className="text-center py-12">
          <p className="text-gray-400">Production line details not found.</p>
          <Link href="/production" className="text-brand-blue hover:underline mt-4 inline-block">Return to Overview</Link>
        </div>
      </DashboardShell>
    );
  }

  const { line, trend, machines, summary } = data;

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header navigation */}
        <div className="flex items-center space-x-4">
          <Link
            href="/production"
            className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              <span>{line.plant.name}</span>
              <span>/</span>
              <span>Line detail</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-1">{line.name} ({line.code})</h1>
          </div>
        </div>

        {/* Top summary row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Line average OEE</p>
            <p className="text-3xl font-extrabold text-brand-cyan mt-2">{summary.oee}%</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Availability</p>
            <p className="text-3xl font-extrabold text-white mt-2">{summary.availability}%</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Performance Index</p>
            <p className="text-3xl font-extrabold text-brand-blue mt-2">{summary.performance}%</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quality Rate</p>
            <p className="text-3xl font-extrabold text-brand-emerald mt-2">{summary.quality}%</p>
          </div>
        </div>

        {/* 30-day Trend Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Production output trend */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6">30-Day Production Output</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#3b82f6" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                  <Area type="monotone" dataKey="unitsProduced" name="Produced (pcs)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOutput)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* OEE Trend chart */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6">30-Day OEE Trend</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#06b6d4" domain={[0, 100]} fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                  <Line type="monotone" dataKey="oee" name="OEE %" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Machine Assets registry */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Machinery Operating on Line</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {machines.map((machine: any) => {
              const activeAlertsCount = machine.maintenanceAlerts?.length || 0;
              
              let statusColor = 'border-brand-emerald text-brand-emerald bg-brand-emerald/10';
              let Icon = CheckCircle2;
              
              if (machine.status === 'WARNING') {
                statusColor = 'border-brand-amber text-brand-amber bg-brand-amber/10';
                Icon = AlertTriangle;
              } else if (machine.status === 'ERROR') {
                statusColor = 'border-brand-rose text-brand-rose bg-brand-rose/10';
                Icon = ShieldAlert;
              }

              return (
                <div key={machine.id} className="glass-card rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-sm text-white">{machine.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{machine.code} • {machine.type}</p>
                      </div>
                      
                      <div className={`flex items-center space-x-1 border px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                        <Icon className="h-3 w-3" />
                        <span className="uppercase">{machine.status}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-4 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Criticality:</span>
                        <span className={`font-semibold ${machine.criticality === 'HIGH' ? 'text-brand-rose' : 'text-gray-400'}`}>
                          {machine.criticality}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Alerts:</span>
                        <span className={`font-semibold ${activeAlertsCount > 0 ? 'text-brand-rose' : 'text-gray-400'}`}>
                          {activeAlertsCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/machines/${machine.id}`}
                    className="w-full text-center py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-gray-300 rounded-lg transition-colors mt-2"
                  >
                    View Diagnostics & Logs
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
