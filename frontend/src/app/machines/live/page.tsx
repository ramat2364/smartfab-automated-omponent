'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  ArrowUpRight, 
  Gauge, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import Link from 'next/link';

export default function LiveHealthMonitoringPage() {
  const { apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9); // 3x3 grid per page

  const fetchLiveMetrics = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const query = (selectedPlantId && selectedPlantId !== 'all') ? `?plantId=${selectedPlantId}` : '';
      const res = await apiFetch(`/machines/live${query}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching live metrics:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 1. Initial fetch
  useEffect(() => {
    fetchLiveMetrics(true);
  }, [selectedPlantId]);

  // 2. Telemetry polling (every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveMetrics(false);
    }, 5001);

    return () => clearInterval(timer);
  }, [selectedPlantId]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId, searchQuery, statusFilter]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  // Filtered live machines list
  const filteredMachines = data.filter(item => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchCode = item.code?.toLowerCase().includes(q);
      const matchPlant = item.plantName?.toLowerCase().includes(q);
      const matchLine = item.lineName?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPlant && !matchLine) return false;
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

  // Helper for pagination page numbers with ellipsis
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary flex items-center space-x-2">
              <Cpu className="h-7 w-7 text-brand-blue" />
              <span>Live Machine Diagnostics</span>
            </h1>
            <p className="text-xs text-text-secondary mt-1">Real-time operational parameters (temperature, vibration, RPM) across plant floor production lines.</p>
          </div>
          
          <div className="flex flex-col items-start sm:items-end text-xs text-text-secondary font-semibold uppercase tracking-wider space-y-1 shrink-0">
            <span className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald pulse-green"></span>
              <span className="text-brand-emerald">Telemetry Diagnostics Active</span>
            </span>
            <span>Last feed sync: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Filter & Query Bar */}
        <div className="glass-card rounded-xl p-4 border border-border-color space-y-3">
          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-2 border-b border-border-color pb-2.5">
            <Filter className="h-3.5 w-3.5 text-brand-blue" />
            <span>Telemetry Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Status Filter */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Health Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-bg-base border border-border-color text-xs text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:border-brand-blue cursor-pointer"
              >
                <option value="">All Health Statuses</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="WARNING">WARNING (Anomaly Flagged)</option>
                <option value="ERROR">ERROR (Critical Threshold Exceeded)</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Search Machine / Asset</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search machine name, code, plant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg pl-8 pr-3 py-2 text-text-primary placeholder-text-secondary/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Total Counters */}
            <div className="text-xs text-text-secondary font-medium sm:text-right">
              Showing <span className="font-bold text-text-primary">{totalEntries}</span> live connected machines
            </div>
          </div>
        </div>

        {/* Live Telemetry Cards Grid */}
        {paginatedMachines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedMachines.map((item) => {
              const isWarning = item.status === 'WARNING';
              const isError = item.status === 'ERROR';
              
              let alertBorder = 'border-border-color';
              let badgeStyle = 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30';
              let StatusIcon = CheckCircle2;

              if (isWarning) {
                alertBorder = 'border-brand-amber/30 bg-brand-amber/5';
                badgeStyle = 'bg-brand-amber/15 text-brand-amber border-brand-amber/30 animate-pulse';
                StatusIcon = AlertTriangle;
              } else if (isError) {
                alertBorder = 'border-brand-rose/30 bg-brand-rose/5';
                badgeStyle = 'bg-brand-rose/15 text-brand-rose border-brand-rose/30 animate-pulse';
                StatusIcon = ShieldAlert;
              }

              // Threshold gauges ratios
              const tempRatio = Math.min(100, Math.round((item.telemetry.temperature / item.thresholds.tempMax) * 100));
              const vibRatio = Math.min(100, Math.round((item.telemetry.vibration / item.thresholds.vibMax) * 100));

              return (
                <div key={item.id} className={`glass-card rounded-xl p-5 border flex flex-col justify-between hover:border-gray-700 transition-colors ${alertBorder}`}>
                  
                  {/* Machine Title Block */}
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-text-primary">{item.name}</h3>
                        <p className="text-[10px] text-text-secondary mt-0.5">{item.code} • {item.plantName} ({item.lineName})</p>
                      </div>
                      
                      <span className={`flex items-center space-x-1 border px-2 py-0.5 rounded text-[9px] font-bold ${badgeStyle}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        <span className="uppercase">{item.status}</span>
                      </span>
                    </div>

                    {/* Telemetry Sensor metrics */}
                    <div className="space-y-4 py-2">
                      {/* Temperature Gauge */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary">Temperature</span>
                          <span className={item.telemetry.temperature > item.thresholds.tempMax ? 'text-brand-rose font-bold' : 'text-text-primary'}>
                            {item.telemetry.temperature}°C <span className="text-[10px] text-text-secondary font-normal">/ {item.thresholds.tempMax}°C max</span>
                          </span>
                        </div>
                        <div className="w-full bg-bg-base rounded-full h-1.5 border border-border-color/30">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${item.telemetry.temperature > item.thresholds.tempMax ? 'bg-brand-rose' : 'bg-brand-cyan'}`}
                            style={{ width: `${tempRatio}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Vibration Gauge */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-text-secondary">Vibration</span>
                          <span className={item.telemetry.vibration > item.thresholds.vibMax ? 'text-brand-rose font-bold' : 'text-text-primary'}>
                            {item.telemetry.vibration} mm/s <span className="text-[10px] text-text-secondary font-normal">/ {item.thresholds.vibMax} mm/s max</span>
                          </span>
                        </div>
                        <div className="w-full bg-bg-base rounded-full h-1.5 border border-border-color/30">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${item.telemetry.vibration > item.thresholds.vibMax ? 'bg-brand-rose' : 'bg-brand-blue'}`}
                            style={{ width: `${vibRatio}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* RPM Metric */}
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-text-secondary flex items-center space-x-1">
                          <Gauge className="h-3.5 w-3.5 text-text-secondary" />
                          <span>Rotational Speed (RPM)</span>
                        </span>
                        <span className="text-text-primary font-bold">{item.telemetry.rpm} rpm</span>
                      </div>
                    </div>
                  </div>

                  {/* Detail Link */}
                  <Link
                    href={`/machines/${item.id}`}
                    className="w-full text-center py-2 bg-bg-surface border border-border-color hover:border-brand-blue text-xs font-semibold text-text-secondary hover:text-text-primary rounded-lg transition-colors mt-4 flex items-center justify-center space-x-1"
                  >
                    <span>Machine Parameter Details</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center text-text-secondary font-medium">
            No live machine assets found matching telemetry filter criteria.
          </div>
        )}

        {/* STANDARDIZED SYSTEM PAGINATION FOOTER */}
        {totalEntries > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-bg-surface border border-border-color rounded-xl gap-4 text-xs text-text-secondary">
            <div>
              Showing <span className="font-semibold text-text-primary">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-text-primary">{endIndex}</span> of{' '}
              <span className="font-semibold text-text-primary">{totalEntries}</span> live machines
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
    </DashboardShell>
  );
}
