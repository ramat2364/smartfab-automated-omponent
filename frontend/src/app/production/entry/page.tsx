'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { Calendar, ClipboardPen, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ShiftEntryPage() {
  const { apiFetch, user } = useAuth();
  const { availablePlants } = usePlant();
  
  const [plantId, setPlantId] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [lineId, setLineId] = useState('');
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftId, setShiftId] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [unitsProduced, setUnitsProduced] = useState('');
  const [scrapCount, setScrapCount] = useState('');
  const [downtimeMinutes, setDowntimeMinutes] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Initial configuration fetch
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoadingConfig(true);
        // Fetch plants with lines
        const plantRes = await apiFetch('/admin/plants');
        const shiftRes = await apiFetch('/admin/shifts');

        if (plantRes.ok && shiftRes.ok) {
          const plantsData = await plantRes.json();
          const shiftsData = await shiftRes.json();

          setShifts(shiftsData);
          if (shiftsData.length > 0) setShiftId(shiftsData[0].id);

          // Select default plant: if user has plantAccess, use it. Otherwise, first plant.
          if (user?.plantAccess) {
            setPlantId(user.plantAccess.id);
            const userPlantObj = plantsData.find((p: any) => p.id === user.plantAccess?.id);
            if (userPlantObj) {
              setLines(userPlantObj.lines || []);
              if (userPlantObj.lines?.length > 0) setLineId(userPlantObj.lines[0].id);
            }
          } else if (plantsData.length > 0) {
            setPlantId(plantsData[0].id);
            setLines(plantsData[0].lines || []);
            if (plantsData[0].lines?.length > 0) setLineId(plantsData[0].lines[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch config data for shift entry:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [user?.id]);

  // 2. Update lines list if plant changes (for admins/cross-plant users)
  const handlePlantChange = async (selectedId: string) => {
    setPlantId(selectedId);
    setLineId('');
    try {
      const res = await apiFetch('/admin/plants');
      if (res.ok) {
        const plantsData = await res.json();
        const matched = plantsData.find((p: any) => p.id === selectedId);
        if (matched) {
          setLines(matched.lines || []);
          if (matched.lines?.length > 0) setLineId(matched.lines[0].id);
        } else {
          setLines([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!plantId || !lineId || !shiftId || !date || unitsProduced === '' || scrapCount === '' || downtimeMinutes === '') {
      setError('All fields are required. Please input numeric entries.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/production/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          plantId,
          lineId,
          shiftId,
          unitsProduced: parseInt(unitsProduced, 10),
          scrapCount: parseInt(scrapCount, 10),
          downtimeMinutes: parseInt(downtimeMinutes, 10),
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to log production entry.');
      }

      setSuccess('Production entry logged successfully!');
      setUnitsProduced('');
      setScrapCount('');
      setDowntimeMinutes('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingConfig) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">Shift-wise Production Log</h1>
          <p className="text-xs text-gray-400 mt-1">Manual entry terminal for recording shift completions, scrap counts, and downtime.</p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-xl p-4 flex items-start space-x-3 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald rounded-xl p-4 flex items-start space-x-3 text-xs font-semibold">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form Panel */}
        <div className="glass-card rounded-xl p-8 border border-gray-800/80">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Date selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Production Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Plant selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Manufacturing Plant
                </label>
                <select
                  disabled={!!user?.plantAccess}
                  value={plantId}
                  onChange={(e) => handlePlantChange(e.target.value)}
                  className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Plant...</option>
                  {availablePlants.map((plant) => (
                    <option key={plant.id} value={plant.id}>{plant.name}</option>
                  ))}
                </select>
              </div>

              {/* Line selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Production Line
                </label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                >
                  <option value="">Select Line...</option>
                  {lines.map((line: any) => (
                    <option key={line.id} value={line.id}>{line.name} ({line.code})</option>
                  ))}
                </select>
              </div>

              {/* Shift selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Operation Shift
                </label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                >
                  <option value="">Select Shift...</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>{shift.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-900 pt-6 space-y-4">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Metrics Logging</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Units Produced */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                    Units Produced (Actual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 450"
                    value={unitsProduced}
                    onChange={(e) => setUnitsProduced(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Scrap Count */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                    Scrap Count (Defect quantity)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={scrapCount}
                    onChange={(e) => setScrapCount(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Downtime minutes */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
                    Line Downtime (Minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 20"
                    value={downtimeMinutes}
                    onChange={(e) => setDowntimeMinutes(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white rounded-lg py-3 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ClipboardPen className="h-4 w-4" />
                  <span>Submit Log Sheet</span>
                </>
              )}
            </button>

          </form>
        </div>

      </div>
    </DashboardShell>
  );
}
