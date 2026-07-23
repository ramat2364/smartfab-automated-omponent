'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { 
  Factory, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Calendar, 
  Filter, 
  Loader2, 
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Gauge,
  Cpu,
  Search
} from 'lucide-react';
import Link from 'next/link';

export default function MachineRegistryPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [machines, setMachines] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [lineId, setLineId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Machine Registration & Edit Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState('CNC');
  const [formPlantId, setFormPlantId] = useState('');
  const [formLineId, setFormLineId] = useState('');
  const [formLinesList, setFormLinesList] = useState<any[]>([]);
  const [formCriticality, setFormCriticality] = useState('MEDIUM');
  const [formInstallDate, setFormInstallDate] = useState('');
  const [formLastMaintenanceDate, setFormLastMaintenanceDate] = useState('');
  const [formStatus, setFormStatus] = useState('OPERATIONAL');
  const [formTempMax, setFormTempMax] = useState('85');
  const [formVibMax, setFormVibMax] = useState('5.0');
  const [formRpmMax, setFormRpmMax] = useState('3000');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to format ISO date to YYYY-MM-DD input string
  const toInputDate = (dateVal?: string | Date) => {
    if (!dateVal) return new Date().toISOString().split('T')[0];
    return new Date(dateVal).toISOString().split('T')[0];
  };

  // 1. Fetch plants & lines
  useEffect(() => {
    if (authLoading) return;

    const fetchConfig = async () => {
      try {
        const res = await apiFetch('/admin/plants');
        if (res.ok) {
          const plantsData = await res.json();
          setPlants(plantsData);

          if (selectedPlantId) {
            const matched = plantsData.find((p: any) => p.id === selectedPlantId);
            setLines(matched?.lines || []);
          } else {
            const allLines = plantsData.flatMap((p: any) => p.lines || []);
            setLines(allLines);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
  }, [authLoading, selectedPlantId]);

  // 2. Fetch machines
  const fetchMachines = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedPlantId) queryParams.append('plantId', selectedPlantId);
      if (lineId) queryParams.append('lineId', lineId);
      if (statusFilter) queryParams.append('status', statusFilter);

      const res = await apiFetch(`/machines?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMachines(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchMachines();
  }, [authLoading, selectedPlantId, lineId, statusFilter]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId, lineId, statusFilter, searchQuery]);

  // Filtered machines
  const filteredMachines = machines.filter(m => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchCode = m.code?.toLowerCase().includes(q);
      const matchType = m.type?.toLowerCase().includes(q);
      const matchPlant = m.plant?.name?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchType && !matchPlant) return false;
    }
    return true;
  });

  // Pagination Math
  const totalEntries = filteredMachines.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const paginatedMachines = filteredMachines.slice(startIndex, endIndex);

  // Generate page numbers with ellipses
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

  // Handle Plant Change in Form
  const handleFormPlantChange = (selectedPlantId: string) => {
    setFormPlantId(selectedPlantId);
    const matched = plants.find(p => p.id === selectedPlantId);
    if (matched) {
      setFormLinesList(matched.lines || []);
      if (matched.lines?.length > 0) setFormLineId(matched.lines[0].id);
    } else {
      setFormLinesList([]);
      setFormLineId('');
    }
  };

  // Open Register Modal
  const openRegisterModal = () => {
    setEditingMachine(null);
    setFormName('');
    setFormCode('');
    setFormType('CNC');
    setFormError('');

    const defaultPlantId = selectedPlantId || (plants.length > 0 ? plants[0].id : '');
    setFormPlantId(defaultPlantId);

    const matched = plants.find(p => p.id === defaultPlantId);
    if (matched) {
      setFormLinesList(matched.lines || []);
      setFormLineId(matched.lines?.length > 0 ? matched.lines[0].id : '');
    }

    setFormCriticality('MEDIUM');
    setFormInstallDate(toInputDate(new Date()));
    setFormLastMaintenanceDate(toInputDate(new Date()));
    setFormStatus('OPERATIONAL');
    setFormTempMax('85');
    setFormVibMax('5.0');
    setFormRpmMax('3000');
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (machine: any) => {
    setEditingMachine(machine);
    setFormName(machine.name);
    setFormCode(machine.code);
    setFormType(machine.type);
    setFormError('');

    setFormPlantId(machine.plantId);
    const matched = plants.find(p => p.id === machine.plantId);
    if (matched) {
      setFormLinesList(matched.lines || []);
      setFormLineId(machine.lineId);
    }

    setFormCriticality(machine.criticality || 'MEDIUM');
    setFormInstallDate(toInputDate(machine.installDate));
    setFormLastMaintenanceDate(toInputDate(machine.lastMaintenanceDate));
    setFormStatus(machine.status || 'OPERATIONAL');
    setFormTempMax(machine.tempThresholdMax?.toString() || '85');
    setFormVibMax(machine.vibThresholdMax?.toString() || '5.0');
    setFormRpmMax(machine.rpmThresholdMax?.toString() || '3000');
    setModalOpen(true);
  };

  // Submit Register or Edit Machine
  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName || !formCode || !formType || !formPlantId || !formLineId) {
      setFormError('All fields are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName,
        code: formCode,
        type: formType,
        plantId: formPlantId,
        lineId: formLineId,
        criticality: formCriticality,
        installDate: formInstallDate,
        lastMaintenanceDate: formLastMaintenanceDate,
        status: formStatus,
        tempThresholdMax: parseFloat(formTempMax),
        vibThresholdMax: parseFloat(formVibMax),
        rpmThresholdMax: parseFloat(formRpmMax)
      };

      const url = editingMachine ? `/machines/${editingMachine.id}` : '/machines';
      const method = editingMachine ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save machine asset.');
      }

      setModalOpen(false);
      fetchMachines();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Machine
  const handleDeleteMachine = async () => {
    if (!deletingMachine) return;
    try {
      setDeleting(true);
      const res = await apiFetch(`/machines/${deletingMachine.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteModalOpen(false);
        setDeletingMachine(null);
        fetchMachines();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading && machines.length === 0) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  const canManageMachines = ['ADMIN', 'PLANT_HEAD', 'MAINTENANCE_ENGINEER'].includes(user?.role || '');

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header with Register Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary flex items-center space-x-2">
              <Cpu className="h-7 w-7 text-brand-blue" />
              <span>Machine Asset Registry</span>
            </h1>
            <p className="text-xs text-text-secondary mt-1">Full machinery listings, status indicators, and operational thresholds.</p>
          </div>

          {canManageMachines && (
            <button
              onClick={openRegisterModal}
              className="flex items-center space-x-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-lg shadow-brand-blue/10 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Register New Machine</span>
            </button>
          )}
        </div>

        {/* Search & Query Filters */}
        <div className="glass-card rounded-xl p-5 border border-border-color space-y-4">
          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-2 border-b border-border-color pb-3">
            <Filter className="h-3.5 w-3.5 text-brand-blue" />
            <span>Search & Query Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Line Filter */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Production Line</label>
              <select
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full bg-bg-base border border-border-color text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="">All Production Lines</option>
                {lines.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Status Code</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-bg-base border border-border-color text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Total Assets: {filteredMachines.length} units</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search machine name, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Machine Assets Table */}
        <div className="glass-card rounded-xl border border-border-color overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-base border-b border-border-color text-text-secondary font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Machine Code / Name</th>
                  <th className="px-6 py-4">Line & Plant Location</th>
                  <th className="px-6 py-4">Criticality</th>
                  <th className="px-6 py-4">Install Date</th>
                  <th className="px-6 py-4">Last Serviced</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {paginatedMachines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-secondary text-xs">
                      No machine assets found matching query criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedMachines.map(machine => {
                    const isWarning = machine.status === 'WARNING';
                    const isError = machine.status === 'ERROR';

                    let statusStyle = 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30';
                    if (isWarning) statusStyle = 'bg-brand-amber/15 text-brand-amber border-brand-amber/30 animate-pulse';
                    if (isError) statusStyle = 'bg-brand-rose/15 text-brand-rose border-brand-rose/30 animate-pulse';

                    return (
                      <tr key={machine.id} className="hover:bg-bg-base/40 text-text-secondary transition-colors">
                        {/* Machine Code & Name */}
                        <td className="px-6 py-4">
                          <p className="font-extrabold text-text-primary text-xs">{machine.name}</p>
                          <p className="text-[10px] text-text-secondary font-mono mt-0.5">{machine.code} • {machine.type}</p>
                        </td>

                        {/* Line & Plant */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-text-primary">{machine.line?.name || 'Line'}</p>
                          <p className="text-[10px] text-text-secondary">{machine.plant?.name || 'Plant'}</p>
                        </td>

                        {/* Criticality Badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                            machine.criticality === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30'
                          }`}>
                            {machine.criticality}
                          </span>
                        </td>

                        {/* Install Date */}
                        <td className="px-6 py-4 text-text-secondary font-mono text-[11px]">
                          {machine.installDate ? new Date(machine.installDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Jul 2023'}
                        </td>

                        {/* Last Serviced */}
                        <td className="px-6 py-4 text-text-secondary font-mono text-[11px]">
                          {machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '5 Jul 2026'}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center space-x-1 border px-2.5 py-0.5 rounded text-[10px] font-bold ${statusStyle}`}>
                            <span>{machine.status}</span>
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {canManageMachines && (
                              <>
                                <button
                                  onClick={() => openEditModal(machine)}
                                  className="p-1.5 bg-bg-surface border border-border-color hover:border-brand-blue text-text-secondary hover:text-text-primary rounded transition-colors cursor-pointer"
                                  title="Edit Thresholds & Asset Details"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                {user?.role === 'ADMIN' && (
                                  <button
                                    onClick={() => { setDeletingMachine(machine); setDeleteModalOpen(true); }}
                                    className="p-1.5 bg-bg-surface border border-border-color hover:border-red-500 text-text-secondary hover:text-red-400 rounded transition-colors cursor-pointer"
                                    title="De-register Asset"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            <Link
                              href={`/machines/${machine.id}`}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-bg-surface border border-border-color hover:border-brand-blue text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg transition-colors"
                            >
                              <span>Monitor</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* STANDARDIZED SYSTEM PAGINATION FOOTER */}
          {totalEntries > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border-t border-border-color gap-4 text-xs text-text-secondary">
              <div>
                Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
                <span className="font-semibold text-text-primary">{totalEntries}</span> machine assets
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
        </div>

        {/* REGISTER & EDIT MACHINE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex justify-between items-center border-b border-border-color pb-4">
                <h3 className="text-base font-extrabold text-text-primary flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-brand-blue" />
                  <span>{editingMachine ? 'Edit Machine Asset & Operational Attributes' : 'Register New Machine Asset'}</span>
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-text-secondary hover:text-text-primary cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveMachine} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Machine Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CNC Shaft Lathe 5"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Asset Code *</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingMachine}
                      placeholder="e.g. CNC-PUN-05"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Machine Type *</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="CNC">CNC Cutting Machine</option>
                      <option value="Press">Hydraulic Press</option>
                      <option value="Injection Molding">Injection Molding</option>
                      <option value="Assembly">Assembly Automation</option>
                      <option value="Paint Shop">Paint Booth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Criticality Rating</label>
                    <select
                      value={formCriticality}
                      onChange={(e) => setFormCriticality(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="HIGH">HIGH (Critical Bottleneck)</option>
                      <option value="MEDIUM">MEDIUM (Standard Line)</option>
                      <option value="LOW">LOW (Auxiliary Support)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Manufacturing Plant *</label>
                    <select
                      disabled={!!editingMachine}
                      value={formPlantId}
                      onChange={(e) => handleFormPlantChange(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary disabled:opacity-50"
                    >
                      <option value="">Select Plant...</option>
                      {plants.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Production Line *</label>
                    <select
                      disabled={!!editingMachine}
                      value={formLineId}
                      onChange={(e) => setFormLineId(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary disabled:opacity-50"
                    >
                      <option value="">Select Production Line...</option>
                      {formLinesList.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Install Date Input */}
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Install Date *</label>
                    <input
                      type="date"
                      required
                      value={formInstallDate}
                      onChange={(e) => setFormInstallDate(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    />
                  </div>

                  {/* Last Serviced Date Input */}
                  <div>
                    <label className="block text-text-secondary font-semibold mb-1">Last Serviced Date *</label>
                    <input
                      type="date"
                      required
                      value={formLastMaintenanceDate}
                      onChange={(e) => setFormLastMaintenanceDate(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    />
                  </div>

                  {/* Operational Status Dropdown */}
                  <div className="sm:col-span-2">
                    <label className="block text-text-secondary font-semibold mb-1">Operational Status *</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                    >
                      <option value="OPERATIONAL">OPERATIONAL (Normal)</option>
                      <option value="WARNING">WARNING (Sensor Anomaly Flagged)</option>
                      <option value="ERROR">ERROR (Critical Downtime Alert)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Preventive Overhaul)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-border-color pt-4 space-y-3">
                  <h4 className="font-bold text-brand-cyan uppercase tracking-wider text-[11px]">Safety Threshold Limits</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-text-secondary mb-1">Max Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formTempMax}
                        onChange={(e) => setFormTempMax(e.target.value)}
                        className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-text-secondary mb-1">Max Vib (mm/s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formVibMax}
                        onChange={(e) => setFormVibMax(e.target.value)}
                        className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-text-secondary mb-1">Max RPM</label>
                      <input
                        type="number"
                        value={formRpmMax}
                        onChange={(e) => setFormRpmMax(e.target.value)}
                        className="w-full bg-bg-base border border-border-color focus:border-brand-blue rounded-lg px-3 py-2 text-text-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-border-color">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary rounded-lg text-xs font-semibold cursor-pointer border border-border-color"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{editingMachine ? 'Save Changes' : 'Register Asset'}</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE MACHINE CONFIRMATION MODAL */}
        {deleteModalOpen && deletingMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-surface border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex items-center space-x-3 text-red-400">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-base font-bold text-text-primary">De-register Machine Asset</h3>
              </div>

              <p className="text-xs text-text-secondary">
                Are you sure you want to de-register <span className="font-bold text-text-primary">{deletingMachine.name}</span> ({deletingMachine.code})? This will remove the asset profile from the registry directory.
              </p>

              <div className="flex justify-end space-x-3 pt-3 border-t border-border-color">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base text-text-secondary rounded-lg text-xs font-semibold cursor-pointer border border-border-color"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMachine}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>De-register Asset</span>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
