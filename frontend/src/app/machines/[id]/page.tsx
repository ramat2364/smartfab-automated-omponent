'use client';

import React, { useState, useEffect, use } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import MaintenanceLogsPage from '../logs/page';
import LiveHealthPage from '../live/page';
import PredictiveAlertsPage from '../alerts/page';

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const machineId = resolvedParams.id;

  if (machineId === 'logs') {
    return <MaintenanceLogsPage />;
  }
  if (machineId === 'live') {
    return <LiveHealthPage />;
  }
  if (machineId === 'alerts') {
    return <PredictiveAlertsPage />;
  }
  
  const { apiFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMachineDetail = async () => {
    try {
      const res = await apiFetch(`/machines/${machineId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setErrorMsg(null);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setErrorMsg(errJson.message || 'Machine asset details not found.');
      }
    } catch (err) {
      console.error('Error fetching machine details:', err);
      setErrorMsg('Failed to load machine asset details. Please try again.');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchMachineDetail();
      setLoading(false);
    };
    init();
  }, [machineId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  if (!data || !data.machine) {
    return (
      <DashboardShell>
        <div className="text-center py-16 max-w-md mx-auto space-y-4">
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <p className="text-gray-300 font-semibold text-sm">{errorMsg || 'Machine asset details not found.'}</p>
            <p className="text-xs text-gray-500 mt-1">Check your plant access scope or select another machine asset from the registry.</p>
          </div>
          <Link href="/machines" className="px-4 py-2 bg-brand-blue/10 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue/20 rounded-lg text-xs font-bold transition-colors inline-block">
            Return to Registry
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { machine, activeAlerts, maintenanceLogs, sensorHistory } = data;

  // Format timestamp strings for the charts
  const chartData = sensorHistory.map((item: any) => ({
    ...item,
    time: new Date(item.timestamp).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  let statusColor = 'border-brand-emerald text-brand-emerald bg-brand-emerald/10';
  let StatusIcon = CheckCircle2;
  
  if (machine.status === 'WARNING') {
    statusColor = 'border-brand-amber text-brand-amber bg-brand-amber/10 animate-pulse';
    StatusIcon = AlertTriangle;
  } else if (machine.status === 'ERROR') {
    statusColor = 'border-brand-rose text-brand-rose bg-brand-rose/10 animate-pulse';
    StatusIcon = ShieldAlert;
  }

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/machines"
            className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              <span>{machine.plant?.name}</span>
              <span>/</span>
              <span>{machine.line?.name}</span>
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <h1 className="text-2xl font-extrabold text-white">{machine.name}</h1>
              <span className={`inline-flex items-center space-x-1 border px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                <StatusIcon className="h-3 w-3" />
                <span className="uppercase">{machine.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Machine Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Machine Code</p>
            <p className="text-lg font-bold text-white mt-1">{machine.code}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Asset Category</p>
            <p className="text-lg font-bold text-brand-blue mt-1">{machine.type}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Criticality rating</p>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1.5 ${
              machine.criticality === 'HIGH' 
                ? 'bg-brand-rose/15 text-brand-rose border border-brand-rose/25'
                : 'bg-gray-800 text-gray-400'
            }`}>
              {machine.criticality}
            </span>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Last Serviced</p>
            <p className="text-sm font-semibold text-gray-300 mt-1.5">
              {new Date(machine.lastMaintenanceDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Active Alerts Panel */}
        {activeAlerts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-md font-bold text-white flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-rose animate-ping"></span>
              <span className="text-brand-rose">Active Anomalies Detected ({activeAlerts.length})</span>
            </h2>

            {activeAlerts.map((alert: any) => (
              <div key={alert.id} className="glass-card rounded-xl p-6 border border-brand-rose/25 bg-brand-rose/5 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="bg-brand-rose/10 border border-brand-rose/20 text-[10px] text-brand-rose font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                  
                  <Link
                    href="/machines/alerts"
                    className="flex items-center space-x-1 text-xs text-brand-cyan hover:underline font-bold"
                  >
                    <span>Open Work Order Form</span>
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </Link>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-white">{alert.message}</h4>
                  <p className="text-xs text-gray-400 mt-1">Trigger metric: <span className="text-brand-rose font-bold">{alert.triggerValue}</span></p>
                </div>

                {alert.aiRecommendation && (
                  <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-brand-cyan uppercase tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span>AI Predictive analysis</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{alert.aiRecommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 24-Hour Telemetry Graphs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Temperature 24h Graph */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6">24-Hour Temperature Profile</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#f43f5e" domain={[20, 100]} fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                  {/* Reference line for warning threshold! */}
                  <ReferenceLine y={machine.tempThresholdMax} label={{ value: 'CRITICAL LIMIT', fill: '#f43f5e', fontSize: 8, position: 'top' }} stroke="#f43f5e" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vibration 24h Graph */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6">24-Hour Vibration Velocity</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={9} />
                  <YAxis stroke="#3b82f6" domain={[0, 6]} fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                  {/* Reference line for vibration warning threshold! */}
                  <ReferenceLine y={machine.vibThresholdMax} label={{ value: 'CRITICAL LIMIT', fill: '#f43f5e', fontSize: 8, position: 'top' }} stroke="#f43f5e" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="vibration" name="Vibration (mm/s)" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Maintenance History */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Completed Maintenance Register</h2>

          <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Service Date</th>
                    <th className="px-6 py-4">Technician</th>
                    <th className="px-6 py-4">Work Description</th>
                    <th className="px-6 py-4">Parts Replaced</th>
                    <th className="px-6 py-4 text-right">Line Downtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {maintenanceLogs.map((log: any) => {
                    const logDateStr = new Date(log.completedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    return (
                      <tr key={log.id} className="hover:bg-gray-900/40 text-gray-300">
                        <td className="px-6 py-4 font-semibold text-white">{logDateStr}</td>
                        <td className="px-6 py-4 font-medium text-brand-blue">{log.technician?.name}</td>
                        <td className="px-6 py-4 max-w-sm truncate" title={log.workDescription}>{log.workDescription}</td>
                        <td className="px-6 py-4 text-gray-400">{log.partsUsed}</td>
                        <td className="px-6 py-4 text-right text-brand-amber font-bold flex items-center justify-end space-x-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span>{log.downtimeMinutes} min</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {maintenanceLogs.length === 0 && (
              <div className="p-8 text-center text-gray-500 font-medium bg-[#0D1224]/50">
                No past servicing logs recorded for this asset.
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
