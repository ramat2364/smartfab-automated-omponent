'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, Loader2 } from 'lucide-react';

export default function QualityRootCausePage() {
  const { apiFetch } = useAuth();
  const { selectedPlantId } = usePlant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRcaData = async () => {
      try {
        setLoading(true);
        const query = selectedPlantId ? `?plantId=${selectedPlantId}` : '';
        const res = await apiFetch(`/quality/root-cause${query}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error('Error fetching quality analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRcaData();
  }, [selectedPlantId]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  const categories = data?.categories || [];
  const parts = data?.parts || [];
  const types = data?.types || [];

  // Colors for Pie cells
  const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">Quality Root Cause Analysis</h1>
          <p className="text-xs text-gray-400 mt-1">Aggregated statistics mapping defect distribution to failure categories and part numbers.</p>
        </div>

        {/* RCA Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Pie: Defect by Root Cause Category */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-brand-cyan" />
                <span>Defects by Root Cause Category</span>
              </h3>
              
              {categories.length > 0 ? (
                <div className="h-64 w-full flex flex-col md:flex-row items-center justify-center">
                  <div className="h-full w-full md:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                        <Pie
                          data={categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="quantity"
                          nameKey="name"
                        >
                          {categories.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend list */}
                  <div className="space-y-2 mt-4 md:mt-0 md:pl-4 text-xs font-medium w-full md:w-1/2">
                    {categories.map((cat: any, index: number) => (
                      <div key={cat.id} className="flex justify-between items-center">
                        <span className="flex items-center space-x-2 text-gray-400">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                          <span>{cat.name}</span>
                        </span>
                        <span className="text-white font-bold">{cat.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No root cause categories classified yet.
                </div>
              )}
            </div>
          </div>

          {/* Bar: Defects by Part Number */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-brand-blue" />
              <span>Scrap Volume by Part Number</span>
            </h3>

            {parts.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="partNumber" stroke="#9CA3AF" fontSize={9} />
                    <YAxis stroke="#3b82f6" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                    <Bar dataKey="quantity" name="Scrap Quantity (pcs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No defect quantities logged to display.
              </div>
            )}
          </div>

          {/* Bar: Defects by Failure Mode / Type */}
          <div className="glass-card rounded-xl p-6 border border-gray-800/80 lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-6 flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-brand-rose" />
              <span>Defect Quantities by Failure Classification</span>
            </h3>

            {types.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={types} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="defectType" stroke="#9CA3AF" fontSize={9} />
                    <YAxis stroke="#f43f5e" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B' }} />
                    <Bar dataKey="quantity" name="Quantity (pcs)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No failure classifications logged.
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardShell>
  );
}
