'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { 
  Activity, 
  AlertTriangle, 
  Bot, 
  Wrench, 
  ShieldCheck, 
  Search, 
  Download, 
  RefreshCw, 
  Eye, 
  CheckCircle, 
  Info,
  Clock,
  Terminal,
  X
} from 'lucide-react';

export default function SystemLogsPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();

  const [logsData, setLogsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Selected Log for Inspector Modal
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const init = async () => {
      setLoading(true);
      await fetchLogs();
      setLoading(false);
    };
    init();
  }, [authLoading]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const allLogs: any[] = logsData?.logs || [];

  // Filtered logs calculation
  const filteredLogs = allLogs.filter(log => {
    // Type tab filter
    if (activeTab !== 'ALL' && log.type !== activeTab) return false;

    // Severity filter
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = log.title?.toLowerCase().includes(q);
      const matchService = log.service?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchPlant = log.plant?.toLowerCase().includes(q);
      if (!matchTitle && !matchService && !matchDetails && !matchPlant) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalEntries = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const currentEntries = filteredLogs.slice(startIndex, endIndex);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Log ID', 'Timestamp', 'Type', 'Severity', 'Service', 'Title', 'Details', 'Payload / Plant'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toLocaleString(),
      l.type,
      l.severity,
      `"${l.service || ''}"`,
      `"${l.title || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.payload || l.plant || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartfab_system_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'AI_ENGINE':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/30"><Bot className="h-3 w-3" /><span>AI ENGINE</span></span>;
      case 'MACHINE_ANOMALY':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30"><AlertTriangle className="h-3 w-3" /><span>ANOMALY</span></span>;
      case 'WORK_ORDER':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30"><Wrench className="h-3 w-3" /><span>MAINTENANCE</span></span>;
      case 'QUALITY_DEFECT':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30"><ShieldCheck className="h-3 w-3" /><span>QUALITY</span></span>;
      default:
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300"><span>SYSTEM</span></span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse"><AlertTriangle className="h-3 w-3" /><span>CRITICAL</span></span>;
      case 'WARNING':
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"><Info className="h-3 w-3" /><span>WARNING</span></span>;
      default:
        return <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><CheckCircle className="h-3 w-3" /><span>INFO</span></span>;
    }
  };

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <Activity className="h-7 w-7 text-brand-blue" />
              <span>System Audit & Error Monitoring Cockpit</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Real-time audit logbook tracking AI engine calls, machine sensor anomalies, defect entries, and maintenance work logs.</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
              <span>Refresh Logs</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-blue/10"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Audit Trail (CSV)</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 border border-gray-800/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Audit Logs</p>
              <p className="text-2xl font-black text-white mt-1">{logsData?.totalLogs || 0}</p>
            </div>
            <div className="p-3 bg-brand-blue/10 rounded-xl border border-brand-blue/20">
              <Terminal className="h-5 w-5 text-brand-blue" />
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-gray-800/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active System Anomalies</p>
              <p className="text-2xl font-black text-red-400 mt-1">{logsData?.anomaliesCount || 0}</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-gray-800/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">AI Engine Executions</p>
              <p className="text-2xl font-black text-brand-cyan mt-1">{logsData?.aiLogsCount || 0}</p>
            </div>
            <div className="p-3 bg-brand-cyan/10 rounded-xl border border-brand-cyan/20">
              <Bot className="h-5 w-5 text-brand-cyan" />
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 border border-gray-800/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Logging Status</p>
              <p className="text-xs font-bold text-emerald-400 mt-2 flex items-center space-x-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Streaming & Auditing Active</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="glass-card rounded-xl p-4 border border-gray-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Event Logs' },
              { id: 'AI_ENGINE', label: 'AI Engine Calls' },
              { id: 'MACHINE_ANOMALY', label: 'Machine Anomalies' },
              { id: 'WORK_ORDER', label: 'Maintenance Work' },
              { id: 'QUALITY_DEFECT', label: 'Quality Defects' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                    : 'bg-gray-950/40 hover:bg-gray-900 text-gray-400 hover:text-white border border-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Severity Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
              className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL Only</option>
              <option value="WARNING">WARNING Only</option>
              <option value="INFO">INFO Only</option>
            </select>

            {/* Keyword Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search logs, keywords..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-950 border border-gray-800 focus:border-brand-blue text-xs rounded-lg pl-8 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Unified Logs Table */}
        <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Source / Service</th>
                  <th className="px-6 py-4">Event Title</th>
                  <th className="px-6 py-4">Details Snippet</th>
                  <th className="px-6 py-4 text-center">Inspect Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {currentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-xs">
                      No system logs match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  currentEntries.map(log => (
                    <tr key={log.id} className="hover:bg-gray-900/40 text-gray-300 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-gray-400 flex items-center space-x-1.5">
                        <Clock className="h-3 w-3 text-gray-500 shrink-0" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">{getTypeBadge(log.type)}</td>
                      <td className="px-6 py-4">{getSeverityBadge(log.severity)}</td>
                      <td className="px-6 py-4 font-bold text-white">{log.service}</td>
                      <td className="px-6 py-4 font-semibold text-gray-200 max-w-xs truncate">{log.title}</td>
                      <td className="px-6 py-4 text-gray-400 max-w-sm truncate">{log.details}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="p-1.5 bg-gray-900 border border-gray-800 hover:border-brand-blue text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalEntries > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border-t border-border-color gap-4 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
                <span className="font-semibold text-text-primary">{totalEntries}</span> logs
              </div>
              {totalPages > 1 && (
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    className="px-3 py-1.5 bg-bg-surface hover:bg-bg-base disabled:opacity-40 disabled:hover:bg-bg-surface border border-border-color text-text-secondary hover:text-text-primary font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-400">
                    Page <span className="font-bold text-white">{activePage}</span> of <span className="font-bold text-white">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="px-3 py-1.5 bg-bg-surface hover:bg-bg-base disabled:opacity-40 disabled:hover:bg-bg-surface border border-border-color text-text-secondary hover:text-text-primary font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* LOG PAYLOAD INSPECTOR MODAL */}
        {inspectLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary overflow-hidden">
              <div className="flex justify-between items-start border-b border-gray-900 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    {getTypeBadge(inspectLog.type)}
                    {getSeverityBadge(inspectLog.severity)}
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-2">{inspectLog.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Logged on {new Date(inspectLog.timestamp).toLocaleString()} • Source: {inspectLog.service}</p>
                </div>
                <button
                  onClick={() => setInspectLog(null)}
                  className="p-1 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Message Details */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Event Message</h4>
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 text-xs text-gray-200 leading-relaxed font-mono whitespace-pre-wrap">
                  {inspectLog.details}
                </div>
              </div>

              {/* Raw Payload / AI Prompt / Recommendation */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Raw Payload / AI Execution Context</h4>
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-800 text-xs text-brand-cyan leading-relaxed font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {inspectLog.payload || inspectLog.plant || 'No extended payload'}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-900">
                <button
                  onClick={() => setInspectLog(null)}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
