'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { Settings, Factory, Calendar, CheckCircle, AlertTriangle, Loader2, Gauge, ShieldAlert, Plus, Edit, Trash2, Shield } from 'lucide-react';

export default function SystemSettingsPage() {
  const { user: currentUser, apiFetch } = useAuth();
  
  const [machines, setMachines] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Machine editing state
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [criticality, setCriticality] = useState('MEDIUM');
  const [tempThresholdMax, setTempThresholdMax] = useState('');
  const [vibThresholdMax, setVibThresholdMax] = useState('');
  const [rpmThresholdMax, setRpmThresholdMax] = useState('');

  // Plant Creation & Edit & Delete State
  const [plantModalOpen, setPlantModalOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState<any | null>(null);
  const [plantName, setPlantName] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [plantLocation, setPlantLocation] = useState('');
  const [plantLoading, setPlantLoading] = useState(false);

  const [deletePlantModalOpen, setDeletePlantModalOpen] = useState(false);
  const [plantToDelete, setPlantToDelete] = useState<any | null>(null);
  const [deletePlantLoading, setDeletePlantLoading] = useState(false);

  // Shift Edit State
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any | null>(null);
  const [shiftName, setShiftName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shiftLoading, setShiftLoading] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchConfigData = async () => {
    try {
      const [machRes, plantRes, shiftRes] = await Promise.all([
        apiFetch('/machines'),
        apiFetch('/admin/plants'),
        apiFetch('/admin/shifts')
      ]);

      if (machRes.ok && plantRes.ok && shiftRes.ok) {
        const machs = await machRes.json();
        setMachines(machs);
        setPlants(await plantRes.json());
        setShifts(await shiftRes.json());

        if (machs.length > 0 && !selectedMachineId) {
          setSelectedMachineId(machs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchConfigData();
      setLoading(false);
    };
    init();
  }, []);

  const openCreatePlantModal = () => {
    setEditingPlant(null);
    setPlantName('');
    setPlantCode('');
    setPlantLocation('');
    setError('');
    setPlantModalOpen(true);
  };

  const openEditPlantModal = (p: any) => {
    setEditingPlant(p);
    setPlantName(p.name);
    setPlantCode(p.code);
    setPlantLocation(p.location);
    setError('');
    setPlantModalOpen(true);
  };

  const openDeletePlantModal = (p: any) => {
    setPlantToDelete(p);
    setError('');
    setDeletePlantModalOpen(true);
  };

  const handleSavePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!plantName || !plantCode || !plantLocation) {
      setError('Plant name, code, and location are required.');
      return;
    }
    try {
      setPlantLoading(true);
      const url = editingPlant ? `/admin/plants/${editingPlant.id}` : '/admin/plants';
      const method = editingPlant ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plantName, code: plantCode, location: plantLocation })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save plant.');
      }
      setSuccess(editingPlant ? `Plant "${plantName}" updated!` : `Plant "${plantName}" registered!`);
      await fetchConfigData();
      setPlantModalOpen(false);
      setEditingPlant(null);
      setPlantName('');
      setPlantCode('');
      setPlantLocation('');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving plant.');
    } finally {
      setPlantLoading(false);
    }
  };

  const handleDeletePlant = async () => {
    if (!plantToDelete) return;
    setError('');
    try {
      setDeletePlantLoading(true);
      const res = await apiFetch(`/admin/plants/${plantToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to delete plant.');
      }
      setSuccess(`Plant "${plantToDelete.name}" deleted successfully.`);
      await fetchConfigData();
      setDeletePlantModalOpen(false);
      setPlantToDelete(null);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting plant.');
    } finally {
      setDeletePlantLoading(false);
    }
  };

  const handleEditShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editingShift || !shiftName || !startTime || !endTime) {
      setError('Shift name, start time, and end time are required.');
      return;
    }
    try {
      setShiftLoading(true);
      const res = await apiFetch(`/admin/shifts/${editingShift.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shiftName, startTime, endTime })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to update shift.');
      }
      setSuccess(`Shift "${shiftName}" timings updated successfully!`);
      await fetchConfigData();
      setShiftModalOpen(false);
      setEditingShift(null);
      setTimeout(() => setSuccess(''), 2500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating shift.');
    } finally {
      setShiftLoading(false);
    }
  };

  const openShiftEditModal = (s: any) => {
    setEditingShift(s);
    setShiftName(s.name);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setError('');
    setShiftModalOpen(true);
  };

  // Sync edit form fields when selected machine changes
  useEffect(() => {
    if (!selectedMachineId) return;
    const match = machines.find((m) => m.id === selectedMachineId);
    if (match) {
      setSelectedMachine(match);
      setName(match.name);
      setCriticality(match.criticality);
      setTempThresholdMax(String(match.tempThresholdMax));
      setVibThresholdMax(String(match.vibThresholdMax));
      setRpmThresholdMax(String(match.rpmThresholdMax));
    }
  }, [selectedMachineId, machines]);

  const handleSubmitThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMachineId || !name || !tempThresholdMax || !vibThresholdMax || !rpmThresholdMax) {
      setError('All parameters are required.');
      return;
    }

    try {
      setSubmitLoading(true);
      const res = await apiFetch(`/admin/machines/${selectedMachineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          criticality,
          tempThresholdMax: parseFloat(tempThresholdMax),
          vibThresholdMax: parseFloat(vibThresholdMax),
          rpmThresholdMax: parseFloat(rpmThresholdMax)
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update machine config.');
      }

      setSuccess('Machine alert thresholds updated successfully!');
      
      // Refresh list values
      await fetchConfigData();
      
      setTimeout(() => setSuccess(''), 2000);
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

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
            <Settings className="h-7 w-7 text-brand-blue" />
            <span>System Settings</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Configure operating parameter thresholds, check shift schedules, and review manufacturing plants.</p>
        </div>

        {/* Statuses */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Machine Threshold Editor (Left) */}
          <div className="lg:col-span-2 glass-card rounded-xl p-8 border border-gray-800/80 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operating Parameter Configuration</h3>
              <p className="text-xs text-gray-400 mt-1">Select a machine asset to calibrate operating parameter thresholds and criticality ratings.</p>
            </div>

            <form onSubmit={handleSubmitThresholds} className="space-y-4">
              {/* Select Machine */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Machine Asset</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                >
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMachine && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Machine Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Asset Label</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Criticality Rating */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">Criticality Level</label>
                      <select
                        value={criticality}
                        onChange={(e) => setCriticality(e.target.value)}
                        className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>

                    {/* Temperature Max */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center space-x-1">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" />
                        <span>Max Temperature (°C)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempThresholdMax}
                        onChange={(e) => setTempThresholdMax(e.target.value)}
                        className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Vibration Max */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center space-x-1">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" />
                        <span>Max Vibration (mm/s)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vibThresholdMax}
                        onChange={(e) => setVibThresholdMax(e.target.value)}
                        className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* RPM Max */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center space-x-1">
                        <Gauge className="h-3.5 w-3.5 text-gray-500" />
                        <span>Max Rotational Speed Limit (RPM)</span>
                      </label>
                      <input
                        type="number"
                        value={rpmThresholdMax}
                        onChange={(e) => setRpmThresholdMax(e.target.value)}
                        className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white rounded-lg py-3 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    {submitLoading ? (
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    ) : (
                      <>
                        <ShieldAlert className="h-4.5 w-4.5" />
                        <span>Apply Calibration Values</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>

          {/* Plant & Shift config details (Right) */}
          <div className="space-y-6">
            {/* Plants display */}
            <div className="glass-card rounded-xl p-5 border border-gray-800/80 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                  <Factory className="h-4.5 w-4.5 text-brand-blue" />
                  <span>Operating Plants</span>
                </h3>
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={openCreatePlantModal}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border border-brand-blue/30 rounded text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Plant</span>
                  </button>
                )}
              </div>
              <div className="space-y-3 text-xs">
                {plants.map((p) => (
                  <div key={p.id} className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-900 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{p.code} • {p.location}</p>
                    </div>
                    {currentUser?.role === 'ADMIN' && (
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => openEditPlantModal(p)}
                          title="Edit Plant Details"
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => openDeletePlantModal(p)}
                          title="De-register / Remove Plant"
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Shifts display */}
            <div className="glass-card rounded-xl p-5 border border-gray-800/80 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                  <Calendar className="h-4.5 w-4.5 text-brand-cyan" />
                  <span>Shift Schedules</span>
                </h3>
              </div>
              <div className="space-y-3 text-xs">
                {shifts.map((s) => (
                  <div key={s.id} className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-900 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{s.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2 py-0.5 rounded font-bold uppercase">
                        {s.startTime} - {s.endTime}
                      </span>
                      {currentUser?.role === 'ADMIN' && (
                        <button
                          onClick={() => openShiftEditModal(s)}
                          title="Edit Shift Timings"
                          className="p-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ADD / EDIT PLANT MODAL */}
        {plantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex items-center space-x-2 text-brand-blue">
                <Factory className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">{editingPlant ? 'Modify Plant Facility' : 'Register Manufacturing Plant'}</h3>
              </div>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSavePlant} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Plant Facility Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Riyadh Plant / Dammam Facility"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Facility Code *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. PLN-RIY"
                    value={plantCode}
                    onChange={(e) => setPlantCode(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Location / Industrial Zone *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 2nd Industrial City, Riyadh, Saudi Arabia"
                    value={plantLocation}
                    onChange={(e) => setPlantLocation(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                  <button
                    type="button"
                    onClick={() => setPlantModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={plantLoading}
                    className="px-5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-brand-blue/10"
                  >
                    {plantLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>{editingPlant ? 'Save Changes' : 'Register Plant'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE PLANT CONFIRMATION MODAL */}
        {deletePlantModalOpen && plantToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex items-center space-x-3 text-brand-rose">
                <AlertTriangle className="h-6 w-6 shrink-0" />
                <h3 className="text-lg font-bold text-white">De-register Plant Facility</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Are you sure you want to permanently delete plant <span className="font-bold text-white">{plantToDelete.name}</span> (<span className="text-brand-cyan">{plantToDelete.code}</span>)?
              </p>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                <button
                  type="button"
                  onClick={() => setDeletePlantModalOpen(false)}
                  className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeletePlant}
                  disabled={deletePlantLoading}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-red-600/10"
                >
                  {deletePlantLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Plant Facility</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT SHIFT MODAL */}
        {shiftModalOpen && editingShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-bg-surface border border-border-color rounded-2xl p-6 shadow-2xl space-y-6 text-text-primary">
              <div className="flex items-center space-x-2 text-brand-cyan">
                <Calendar className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">Configure Shift Timings</h3>
              </div>

              {error && (
                <div className="bg-brand-rose/10 border border-brand-rose/30 text-brand-rose rounded-lg p-3 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleEditShift} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Shift Name *</label>
                  <input
                    required
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Start Time *</label>
                    <input
                      required
                      type="text"
                      placeholder="06:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">End Time *</label>
                    <input
                      required
                      type="text"
                      placeholder="14:00"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-bg-base border border-border-color focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-text-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-border-color justify-end">
                  <button
                    type="button"
                    onClick={() => setShiftModalOpen(false)}
                    className="px-4 py-2 bg-bg-surface hover:bg-bg-base border border-border-color text-text-secondary hover:text-text-primary rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shiftLoading}
                    className="px-5 py-2 bg-brand-cyan hover:bg-brand-cyan/90 text-bg-base rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md shadow-brand-cyan/10"
                  >
                    {shiftLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-bg-base" />
                    ) : (
                      <>
                        <Shield className="h-4 w-4" />
                        <span>Save Shift Timings</span>
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
