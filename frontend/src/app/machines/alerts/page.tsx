'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  User, 
  Wrench, 
  CheckCircle, 
  Loader2, 
  Sparkles,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function PredictiveAlertsPage() {
  const { apiFetch, user } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  // Modal Resolution State
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [workDescription, setWorkDescription] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState('0');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // 1. Fetch active alerts
  const fetchAlerts = async () => {
    try {
      const query = (selectedPlantId && selectedPlantId !== 'all') ? `?plantId=${selectedPlantId}` : '';
      const res = await apiFetch(`/machines/alerts${query}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Fetch technicians for assignment dropdown
  const fetchTechnicians = async () => {
    try {
      const res = await apiFetch('/admin/users');
      if (res.ok) {
        const users = await res.json();
        const techRoles = users.filter((u: any) => u.role === 'MAINTENANCE_ENGINEER' || u.role === 'ADMIN');
        setTechnicians(techRoles);
      } else {
        setTechnicians([
          { id: 'maint-eng-pune', name: 'Arjun Mehta', role: 'MAINTENANCE_ENGINEER' },
          { id: 'admin-corp', name: 'System Administrator', role: 'ADMIN' }
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchTechnicians()]);
      setLoading(false);
    };
    initPage();
  }, [selectedPlantId]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId, severityFilter, searchQuery]);

  // 3. Assign Technician
  const handleAssign = async (alertId: string, techId: string) => {
    if (!techId) return;
    try {
      const res = await apiFetch(`/machines/alerts/${alertId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: techId })
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Resolve Alert
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !workDescription) return;

    try {
      setActionLoading(true);
      const res = await apiFetch(`/machines/alerts/${selectedAlert.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDescription,
          partsUsed,
          downtimeMinutes: parseInt(downtimeMinutes, 10)
        })
      });

      if (res.ok) {
        setModalOpen(false);
        setSelectedAlert(null);
        setWorkDescription('');
        setPartsUsed('');
        setDowntimeMinutes('0');
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
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

  // Filtered Alerts
  const filteredAlerts = alerts.filter(a => {
    if (severityFilter && a.severity !== severityFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchMachine = a.machine?.name?.toLowerCase().includes(q);
      const matchCode = a.machine?.code?.toLowerCase().includes(q);
      const matchMsg = a.message?.toLowerCase().includes(q);
      if (!matchMachine && !matchCode && !matchMsg) return false;
    }
    return true;
  });

  // Pagination Math
  const totalEntries = filteredAlerts.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

  // Helper for pagination numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (activePage > 3) pages.push('...');
      const start = Math.max(2, activePage - 1);
      const end = Math.min(totalPages - 1, activePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (activePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Active Predictive Alerts</h1>
          <p className="text-xs text-text-secondary mt-1">Real-time health anomalies flagged by core machine diagnostic aggregators.</p>
        </div>

        {/* Filter Bar */}
        <div className="glass-card rounded-xl p-4 border border-border-color space-y-3">
          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-2 border-b border-border-color pb-2.5">
            <Filter className="h-3.5 w-3.5 text-brand-blue" />
            <span>Alert Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Severity Filter */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Alert Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full bg-bg-base border border-border-color text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="WARNING">WARNING</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Search Anomaly</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search machine code, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Counter */}
            <div className="text-xs text-text-secondary font-medium sm:text-right">
              Total Active Anomalies: <span className="font-bold text-text-primary">{totalEntries}</span>
            </div>
          </div>
        </div>

        {/* Alerts Listing */}
        <div className="space-y-6">
          {paginatedAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const alertColor = isCritical
              ? 'border-brand-rose/40 bg-brand-rose/5'
              : 'border-brand-amber/40 bg-brand-amber/5';
            
            const Icon = isCritical ? ShieldAlert : AlertTriangle;
            const textBadge = isCritical ? 'text-brand-rose bg-brand-rose/10 border-brand-rose/30' : 'text-brand-amber bg-brand-amber/10 border-brand-amber/30';

            return (
              <div key={alert.id} className={`glass-card rounded-xl border p-6 flex flex-col md:flex-row gap-6 ${alertColor}`}>
                
                {/* Alert details block */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`flex items-center space-x-1 border px-2.5 py-0.5 rounded text-[10px] font-bold ${textBadge}`}>
                      <Icon className="h-3 w-3" />
                      <span className="uppercase">{alert.severity}</span>
                    </span>

                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                      {alert.machine?.plant?.name} • {alert.machine?.line?.name}
                    </span>

                    <span className="text-[10px] text-text-secondary font-semibold flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-text-primary">
                      Anomaly: {alert.machine?.name} ({alert.machine?.code})
                    </h3>
                    <p className="text-xs text-text-secondary font-medium mt-1">{alert.message}</p>
                    <p className="text-xs text-brand-rose font-bold mt-2">Trigger parameter: {alert.triggerValue}</p>
                  </div>

                  {/* AI Prediction recommendations block */}
                  {alert.aiRecommendation && (
                    <div className="bg-brand-blue/5 border border-brand-blue/15 rounded-xl p-4 mt-3 space-y-2">
                      <div className="flex items-center space-x-2 text-[11px] font-bold text-brand-cyan uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>AI Assistant Diagnostic Suggestion</span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">{alert.aiRecommendation}</p>
                    </div>
                  )}
                </div>

                {/* Assignment & resolution tool block */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border-color pt-5 md:pt-0 md:pl-6 flex flex-col justify-between space-y-4">
                  
                  {/* Assigned field */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assigned Engineer</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                      <select
                        value={alert.assignedToId || ''}
                        onChange={(e) => handleAssign(alert.id, e.target.value)}
                        className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg pl-9 pr-4 py-2 text-text-primary focus:outline-none transition-colors"
                      >
                        <option value="">Unassigned...</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>{tech.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Resolve alert trigger */}
                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setModalOpen(true);
                    }}
                    className="w-full bg-brand-emerald hover:bg-brand-emerald/90 text-white rounded-lg py-2.5 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Wrench className="h-4 w-4" />
                    <span>Resolve Maintenance</span>
                  </button>

                </div>

              </div>
            );
          })}

          {paginatedAlerts.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center text-text-secondary font-medium">
              No active anomalies flagged. All systems operational.
            </div>
          )}
        </div>

        {/* STANDARDIZED SYSTEM PAGINATION FOOTER */}
        {totalEntries > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border border-border-color rounded-xl gap-4 text-xs text-text-secondary">
            <div>
              Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
              <span className="font-semibold text-text-primary">{totalEntries}</span> predictive alerts
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
                
                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`dots-${idx}`} className="px-2 py-1.5 text-text-secondary font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum as number)}
                      className={`px-3 py-1.5 border rounded-lg font-semibold transition-colors cursor-pointer ${
                        activePage === pageNum
                          ? 'bg-brand-blue border-brand-blue text-white hover:bg-brand-blue/90'
                          : 'bg-bg-surface border-border-color text-text-secondary hover:bg-bg-base hover:text-text-primary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

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

        {/* RESOLUTION MODAL */}
        {modalOpen && selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Log Corrective Action</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Resolving anomaly for <span className="text-text-primary font-bold">{selectedAlert.machine?.name}</span>.
                </p>
              </div>

              <form onSubmit={handleResolveSubmit} className="space-y-4">
                
                {/* Work description */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Repair Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe parts checked, repairs done, and recalibrations completed..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Parts used */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Spare Parts Used
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spindle bearing kit, grade-3 lubricant, none"
                    value={partsUsed}
                    onChange={(e) => setPartsUsed(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Downtime minutes */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5 font-bold">
                    Downtime Caused (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={downtimeMinutes}
                    onChange={(e) => setDowntimeMinutes(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                {/* CTA Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-brand-emerald hover:bg-brand-emerald/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-brand-emerald/10"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4.5 w-4.5" />
                        <span>Log & Clear Alert</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
