'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { Calendar, Wrench, Clock, Plus, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function MaintenanceLogsPage() {
  const { apiFetch, user } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId]);

  const totalEntries = logs.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const currentEntries = logs.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(2, activePage - 1);
      let end = Math.min(totalPages - 1, activePage + 1);
      
      if (activePage <= 3) {
        end = 4;
      } else if (activePage >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      pages.push(1);
      if (start > 2) {
        pages.push('...');
      }
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  // Form Logging State
  const [modalOpen, setModalOpen] = useState(false);
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineId, setMachineId] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState('0');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');


  // 1. Fetch data
  const fetchData = async () => {
    try {
      const query = (selectedPlantId && selectedPlantId !== 'all') ? `?plantId=${selectedPlantId}` : '';
      
      const [machinesRes, logsRes] = await Promise.all([
        apiFetch(`/machines${query}`),
        apiFetch(`/machines/logs${query}`)
      ]);

      if (machinesRes.ok && logsRes.ok) {
        const machs = await machinesRes.json();
        const logsData = await logsRes.json();
        
        setMachines(machs);
        setLogs(logsData);
        
        if (machs.length > 0) {
          setMachineId(machs[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    init();
  }, [selectedPlantId]);

  // 2. Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!machineId || !workDescription) {
      setError('Machine selection and work description are required.');
      return;
    }

    try {
      setSubmitLoading(true);
      const res = await apiFetch('/machines/maintenance-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId,
          workDescription,
          partsUsed: partsUsed || 'None',
          downtimeMinutes: parseInt(downtimeMinutes, 10),
          completedAt: completedDate
        })
      });


      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit log.');
      }

      setSuccess('Maintenance job logged successfully!');
      setWorkDescription('');
      setPartsUsed('');
      setDowntimeMinutes('0');
      
      // Refresh list
      await fetchData();
      setCurrentPage(1);
      
      // Auto close modal
      setTimeout(() => {
        setModalOpen(false);
        setSuccess('');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSubmitLoading(false);
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

  const canWrite = user?.role === 'MAINTENANCE_ENGINEER' || user?.role === 'PLANT_HEAD' || user?.role === 'ADMIN';

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Maintenance Work Logs</h1>
            <p className="text-xs text-gray-400 mt-1">Audit log of completed preventive maintenance, calibrations, and component swaps.</p>
          </div>
          
          {canWrite && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-blue/10"
            >
              <Plus className="h-4 w-4" />
              <span>Log Maintenance Work</span>
            </button>
          )}
        </div>

        {/* History Register Table */}
        <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Completed Date</th>
                  <th className="px-6 py-4">Machine Code / Asset</th>
                  <th className="px-6 py-4">Technician</th>
                  <th className="px-6 py-4">Work Performed</th>
                  <th className="px-6 py-4">Parts Utilized</th>
                  <th className="px-6 py-4 text-right">Downtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {currentEntries.map((log) => {
                  const dateStr = new Date(log.completedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-gray-900/40 text-gray-300">
                      <td className="px-6 py-4 font-semibold text-white flex items-center space-x-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                        <span>{dateStr}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{log.machine?.name}</div>
                        <div className="text-[10px] text-gray-500 font-medium">{log.machine?.code}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-brand-blue">{log.technician?.name}</td>
                      <td className="px-6 py-4 max-w-xs truncate" title={log.workDescription}>
                        {log.workDescription}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-400">{log.partsUsed}</td>
                      <td className="px-6 py-4 text-right text-brand-amber font-bold flex items-center justify-end space-x-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span>{log.downtimeMinutes} mins</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalEntries > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border-t border-border-color gap-4 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
                <span className="font-semibold text-text-primary">{totalEntries}</span> entries
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

          {totalEntries === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium bg-[#0D1224]/50">
              No completed logs recorded for this plant yet.
            </div>
          )}
        </div>

        {/* WORK LOG ENTRY MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Log Maintenance Work</h3>
                <p className="text-xs text-text-secondary mt-1">Record completed preventive maintenance, calibrations, or component swaps.</p>
              </div>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Completed Date */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                      Completed Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={completedDate}
                      onChange={(e) => setCompletedDate(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Technician (Logged In User) */}
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                      Technician (Logger)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.name || 'Logged in user'}
                      className="w-full bg-bg-base/50 border border-border-color text-xs rounded-lg px-4 py-2.5 text-brand-blue font-semibold cursor-not-allowed opacity-80"
                    />
                  </div>
                </div>

                {/* Machine Code / Asset */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Machine Code / Asset *
                  </label>
                  <select
                    required
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors animate-none"
                  >
                    <option value="">Select Machine Asset...</option>
                    {machines.map((mach) => (
                      <option key={mach.id} value={mach.id}>
                        {mach.name} ({mach.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Work Performed */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Work Performed *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe specific tasks, calibrations, or repair completed..."
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Parts Utilized */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Parts Utilized
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Spindle bearing kit, grade-3 lubricant, none"
                    value={partsUsed}
                    onChange={(e) => setPartsUsed(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary placeholder-text-secondary/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Downtime */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Downtime (Minutes)
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
                    disabled={submitLoading}
                    className="px-5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-brand-blue/10"
                  >
                    {submitLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <Wrench className="h-4.5 w-4.5" />
                        <span>Save Maintenance Log</span>
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
