'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import ReportExport from '@/components/ReportExport';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Calendar, Filter, Loader2, RefreshCw } from 'lucide-react';

export default function ProductionHistoryPage() {
  const { apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  
  const [lines, setLines] = useState<any[]>([]);
  const [lineId, setLineId] = useState('');
  
  // Date states - default to last 30 days
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ entries: [], dailySummary: [] });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlantId, lineId, startDate, endDate]);

  const totalEntries = data.entries.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries);
  const currentEntries = data.entries.slice(startIndex, endIndex);

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

  // 1. Fetch lines for selector when plant changes
  useEffect(() => {
    const fetchLines = async () => {
      try {
        const res = await apiFetch('/admin/plants');
        if (res.ok) {
          const plants = await res.json();
          if (selectedPlantId) {
            const matched = plants.find((p: any) => p.id === selectedPlantId);
            setLines(matched?.lines || []);
          } else {
            // Aggregate all lines across plants
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
  }, [selectedPlantId]);

  // 2. Fetch history records
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      const plant = selectedPlantId;
      if (plant) queryParams.append('plantId', plant);
      if (lineId) queryParams.append('lineId', lineId);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await apiFetch(`/production/history?${queryParams.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedPlantId, lineId, startDate, endDate]);

  const csvHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'plant.name', label: 'Plant' },
    { key: 'line.name', label: 'Line' },
    { key: 'shift.name', label: 'Shift' },
    { key: 'unitsProduced', label: 'Units Produced' },
    { key: 'scrapCount', label: 'Scrap Count' },
    { key: 'downtimeMinutes', label: 'Downtime (min)' }
  ];

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Production History</h1>
            <p className="text-xs text-gray-400 mt-1">Audit trail and charts for historical performance analysis.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchHistory}
              className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <ReportExport
              data={data.entries}
              filename="SmartFab_ProductionHistory"
              headers={csvHeaders}
            />
          </div>
        </div>

        {/* Filters Panel */}
        <div className="glass-card rounded-xl p-5 border border-gray-800/80">
          <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-900 pb-3">
            <Filter className="h-4 w-4 text-brand-blue" />
            <span>Search & Query Filters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-3 py-2 text-white focus:outline-none transition-colors"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-3 py-2 text-white focus:outline-none transition-colors"
              />
            </div>

            {/* Line Selection */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Production Line</label>
              <select
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-3 py-2 text-white focus:outline-none transition-colors"
              >
                <option value="">All Production Lines</option>
                {lines.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                ))}
              </select>
            </div>

            {/* Config details */}
            <div className="flex items-end justify-start md:justify-end text-xs text-gray-500 font-semibold px-2 py-2">
              <span>Found: {data.entries.length} log sheets</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[30vh]">
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          </div>
        ) : (
          <>
            {/* Composed Chart Panel */}
            {data.dailySummary.length > 0 && (
              <div className="glass-card rounded-xl p-6 border border-gray-800/80">
                <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider text-gray-300">Throughput & OEE Performance Trend</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.dailySummary} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="date" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#06b6d4" fontSize={10} domain={[0, 100]} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: 8 }}
                        labelClassName="text-white font-semibold text-xs"
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area yAxisId="left" type="monotone" dataKey="unitsProduced" name="Produced Volume" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProd)" />
                      <Line yAxisId="right" type="monotone" dataKey="oee" name="OEE Trend (%)" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* History Table */}
            <div className="glass-card rounded-xl border border-gray-800/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Logged Date</th>
                      <th className="px-6 py-4">Plant location</th>
                      <th className="px-6 py-4">Production Line</th>
                      <th className="px-6 py-4">Shift Details</th>
                      <th className="px-6 py-4 text-right">Units Produced</th>
                      <th className="px-6 py-4 text-right">Scrap Count</th>
                      <th className="px-6 py-4 text-right">Downtime (mins)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                    {currentEntries.map((entry: any) => {
                      const dateFormatted = new Date(entry.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr key={entry.id} className="hover:bg-gray-900/40 text-gray-300">
                          <td className="px-6 py-4 font-semibold text-white">{dateFormatted}</td>
                          <td className="px-6 py-4">{entry.plant.name}</td>
                          <td className="px-6 py-4 font-medium text-brand-blue">{entry.line.name}</td>
                          <td className="px-6 py-4">{entry.shift.name}</td>
                          <td className="px-6 py-4 text-right text-white font-bold">{entry.unitsProduced}</td>
                          <td className="px-6 py-4 text-right text-brand-rose font-medium">{entry.scrapCount}</td>
                          <td className="px-6 py-4 text-right text-brand-amber font-medium">{entry.downtimeMinutes}</td>
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
                  No historical entries match the selected filters.
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </DashboardShell>
  );
}
