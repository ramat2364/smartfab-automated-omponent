'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import {
  ShieldAlert,
  AlertCircle,
  Clock,
  CheckCircle2,
  PackageX,
  Calendar,
  Filter,
  Loader2,
  Image as ImageIcon,
  Search,
  Plus,
  RotateCcw,
  Tag,
  Cpu,
  UserCheck
} from 'lucide-react';

export default function QualityDefectLogPage() {
  const { user, loading: authLoading, apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [defects, setDefects] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  
  // Filter states
  const [lineId, setLineId] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId, lineId, partNumber, status, search]);

  const totalEntries = defects.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const currentEntries = defects.slice(startIndex, endIndex);

  // Dynamic KPI Metrics
  const pendingCount = defects.filter(d => d.status === 'PENDING').length;
  const investigatingCount = defects.filter(d => d.status === 'INVESTIGATING').length;
  const resolvedCount = defects.filter(d => d.status === 'RESOLVED').length;
  const totalQuantityPcs = defects.reduce((acc, d) => acc + (parseInt(d.quantity, 10) || 0), 0);

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

  // 1. Fetch lines when plant changes
  useEffect(() => {
    if (authLoading) return;

    const fetchLines = async () => {
      try {
        const res = await apiFetch('/admin/plants');
        if (res.ok) {
          const plants = await res.json();
          if (selectedPlantId) {
            const matched = plants.find((p: any) => p.id === selectedPlantId);
            setLines(matched?.lines || []);
          } else {
            const allLines = plants.flatMap((p: any) => p.lines || []);
            setLines(allLines);
          }
          setLineId('');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLines();
  }, [authLoading, selectedPlantId]);

  // 2. Fetch defects
  const fetchDefects = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (selectedPlantId) queryParams.append('plantId', selectedPlantId);
      if (lineId) queryParams.append('lineId', lineId);
      if (partNumber) queryParams.append('partNumber', partNumber);
      if (status) queryParams.append('status', status);
      if (search) queryParams.append('search', search);

      const res = await apiFetch(`/quality/defects?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDefects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchDefects();
  }, [authLoading, selectedPlantId, lineId, partNumber, status, search]);

  const handleResetFilters = () => {
    setLineId('');
    setPartNumber('');
    setStatus('');
    setSearch('');
  };

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-color pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-brand-blue/10 text-brand-blue rounded-lg">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Quality Defect Register</h1>
            </div>
            <p className="text-xs text-text-secondary mt-1 ml-8">
              Real-time scrap audit log, defect classifications, evidence photos, and root-cause tags.
            </p>
          </div>

          {(user?.role === 'QUALITY_ENGINEER' || user?.role === 'PLANT_HEAD' || user?.role === 'ADMIN') && (
            <Link
              href="/quality/entry"
              className="flex items-center space-x-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-brand-blue/20 hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" />
              <span>Log Quality Defect</span>
            </Link>
          )}
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Defects */}
          <div className="glass-card p-4 rounded-xl border border-border-color shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Total Defect Logs</div>
              <div className="text-2xl font-black text-text-primary mt-1">{defects.length}</div>
              <div className="text-[11px] font-semibold text-brand-blue mt-1">Logged Scrap Cases</div>
            </div>
            <div className="p-3 bg-brand-blue/10 text-brand-blue rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: Pending */}
          <div className="glass-card p-4 rounded-xl border border-border-color shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Pending Audit</div>
              <div className="text-2xl font-black text-rose-600 mt-1">{pendingCount}</div>
              <div className="text-[11px] font-semibold text-rose-500 mt-1">Action Required</div>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: In Investigation */}
          <div className="glass-card p-4 rounded-xl border border-border-color shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">In Investigation</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{investigatingCount}</div>
              <div className="text-[11px] font-semibold text-amber-600 mt-1">RCA In Progress</div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Card 4: Total Scrap Volume */}
          <div className="glass-card p-4 rounded-xl border border-border-color shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Scrap Parts Total</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{totalQuantityPcs} pcs</div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-1">{resolvedCount} Issues Resolved</div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <PackageX className="h-6 w-6" />
            </div>
          </div>

        </div>

        {/* Filters Toolbar */}
        <div className="glass-card rounded-2xl p-4 border border-border-color shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-text-primary uppercase tracking-wider">
              <Filter className="h-4 w-4 text-brand-blue" />
              <span>Search & Query Toolbar</span>
            </div>
            {(lineId || status || search) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center space-x-1 text-[11px] font-bold text-text-secondary hover:text-brand-blue transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Free Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search Part #, defect type, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-xl pl-9 pr-4 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Line Select */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Production Line</label>
              <select
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-xl px-3 py-2 text-text-primary focus:outline-none transition-colors"
              >
                <option value="">All Production Lines</option>
                {lines.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Investigation Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-xl px-3 py-2 text-text-primary focus:outline-none transition-colors"
              >
                <option value="">All Investigation Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[35vh]">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          </div>
        ) : (
          /* Defect Log Grid Table */
          <div className="glass-card rounded-2xl border border-border-color overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-border-color text-text-secondary font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-4 py-3.5 whitespace-nowrap">Logged Date</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Part Number</th>
                    <th className="px-4 py-3.5 min-w-[140px]">Defect Classification</th>
                    <th className="px-4 py-3.5 min-w-[240px]">Inspector Observations</th>
                    <th className="px-4 py-3.5 min-w-[160px]">Plant & Line</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Machine Asset</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Quantity</th>
                    <th className="px-4 py-3.5 min-w-[150px]">Root Cause Category</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Status</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-color bg-bg-surface">
                  {currentEntries.map((defect) => {
                    const defectDateStr = new Date(defect.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    let statusDot = 'bg-rose-500';
                    let statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                    if (defect.status === 'INVESTIGATING') {
                      statusDot = 'bg-amber-500 animate-pulse';
                      statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (defect.status === 'RESOLVED') {
                      statusDot = 'bg-emerald-500';
                      statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    }

                    // Backend serves uploaded images on http://localhost:5001/uploads/filename
                    const photoPath = defect.photoUrl ? `http://localhost:5001${defect.photoUrl}` : null;

                    return (
                      <tr key={defect.id} className="hover:bg-slate-50/70 transition-colors text-text-primary">
                        
                        {/* Logged Date */}
                        <td className="px-4 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="h-3.5 w-3.5 text-text-secondary" />
                            <span>{defectDateStr}</span>
                          </div>
                        </td>

                        {/* Part Number */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-900 font-extrabold rounded-lg text-[11px] tracking-wider border border-slate-200">
                            <Tag className="h-3 w-3 text-slate-500" />
                            <span>{defect.partNumber}</span>
                          </div>
                        </td>

                        {/* Defect Classification */}
                        <td className="px-4 py-3.5 font-bold text-text-primary">
                          <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue rounded font-bold text-xs">
                            {defect.defectType}
                          </span>
                        </td>

                        {/* Inspector Observations */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <div className="text-xs text-text-primary font-normal leading-relaxed line-clamp-2" title={defect.description}>
                            {defect.description}
                          </div>
                          {defect.inspector?.name && (
                            <div className="flex items-center space-x-1 text-[10px] text-text-secondary font-medium mt-1">
                              <UserCheck className="h-3 w-3 text-brand-blue" />
                              <span>Inspector: <strong className="text-text-primary">{defect.inspector.name}</strong></span>
                            </div>
                          )}
                        </td>

                        {/* Plant & Line */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-text-primary">{defect.line?.name}</div>
                          <div className="text-[11px] text-text-secondary font-medium">{defect.plant?.name}</div>
                        </td>

                        {/* Machine Asset */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {defect.machine ? (
                            <div className="inline-flex items-center space-x-1 px-2 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg text-[11px] font-semibold">
                              <Cpu className="h-3 w-3 text-cyan-600" />
                              <span>{defect.machine.code || defect.machine.name}</span>
                            </div>
                          ) : (
                            <span className="text-text-secondary text-xs italic">N/A</span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-extrabold text-xs">
                            {defect.quantity} pcs
                          </span>
                        </td>

                        {/* Root Cause Category */}
                        <td className="px-4 py-3.5 font-semibold text-brand-blue">
                          {defect.rootCauseCategory?.name ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]">
                              {defect.rootCauseCategory.name}
                            </span>
                          ) : (
                            <span className="text-text-secondary text-xs italic">Under Investigation</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusBadge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                            <span>{defect.status}</span>
                          </div>
                        </td>

                        {/* Photo Evidence */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {photoPath ? (
                            <button
                              onClick={() => setSelectedPhoto(photoPath)}
                              className="p-1.5 bg-slate-100 hover:bg-brand-blue hover:text-white border border-slate-200 rounded-lg text-brand-blue transition-all cursor-pointer shadow-xs hover:scale-105"
                              title="View photo evidence"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-text-secondary text-xs">-</span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
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
              <div className="p-8 text-center text-text-secondary font-medium bg-bg-base">
                No defects matched the selected criteria.
              </div>
            )}
          </div>
        )}

        {/* PHOTO POPUP MODAL */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-4 relative flex flex-col items-center text-text-primary">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 text-xs font-bold px-3 py-1.5 bg-bg-base hover:bg-slate-200 border border-border-color text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              
              <h3 className="text-sm font-bold text-text-primary text-left w-full uppercase tracking-wider flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-brand-blue" />
                <span>Quality Inspection Defect Evidence</span>
              </h3>
              
              <div className="border border-border-color rounded-xl overflow-hidden max-h-[70vh] w-full flex items-center justify-center bg-bg-base p-2">
                <img
                  src={selectedPhoto}
                  alt="Defect Evidence photo"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-md"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
