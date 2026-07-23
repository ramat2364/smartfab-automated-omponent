'use client';

import React, { useState, useEffect } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { getApiBaseUrl } from '@/config/api';
import { ClipboardPen, Sparkles, Upload, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';


export default function NewDefectEntryPage() {
  const { apiFetch, user } = useAuth();
  const { availablePlants } = usePlant();

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [plantId, setPlantId] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [lineId, setLineId] = useState('');
  const [machines, setMachines] = useState<any[]>([]);
  const [machineId, setMachineId] = useState('');
  
  const [partNumber, setPartNumber] = useState('');
  const [defectType, setDefectType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [rootCauseCategoryId, setRootCauseCategoryId] = useState('');

  // Statuses
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI assist states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiSuggestedCat, setAiSuggestedCat] = useState<any>(null);

  // 1. Initial config fetch
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoadingConfig(true);
        const [plantRes, rcRes] = await Promise.all([
          apiFetch('/admin/plants'),
          apiFetch('/quality/root-cause')
        ]);

        if (plantRes.ok && rcRes.ok) {
          const plantsData = await plantRes.json();
          const rcData = await rcRes.json();
          setCategories(rcData.categories || []);

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
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [user?.id]);

  // 2. Fetch machines under selected line
  useEffect(() => {
    if (!lineId) {
      setMachines([]);
      setMachineId('');
      return;
    }

    const fetchMachines = async () => {
      try {
        const res = await apiFetch(`/production/line/${lineId}`);
        if (res.ok) {
          const result = await res.json();
          setMachines(result.machines || []);
          if (result.machines?.length > 0) {
            setMachineId(''); // optional field
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMachines();
  }, [lineId]);

  // 3. Trigger AI Diagnosis
  const handleAiDiagnose = async () => {
    if (!partNumber) {
      setError('Please select a Component Part Number before running AI Root-Cause Assist.');
      return;
    }
    if (!description) {
      setError('Please enter Inspector Observations describing the defect before running AI Root-Cause Assist.');
      return;
    }


    try {
      setAiLoading(true);
      setError('');
      const res = await apiFetch('/quality/ai-root-cause-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          partNumber,
          machineId: machineId || undefined
        })
      });

      if (res.ok) {
        const result = await res.json();
        setAiRecommendation(result.recommendation);
        setAiSuggestedCat(result.suggestedCategory);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiCategory = () => {
    if (aiSuggestedCat) {
      setRootCauseCategoryId(aiSuggestedCat.id);
      setSuccess(`Auto-applied AI Root Cause: ${aiSuggestedCat.name}`);
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  // 4. Form submission (multipart Form Data)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!plantId || !lineId || !partNumber || !defectType || !quantity || !description) {
      setError('Missing required parameters.');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('date', date);
      formData.append('plantId', plantId);
      formData.append('lineId', lineId);
      if (machineId) formData.append('machineId', machineId);
      formData.append('partNumber', partNumber);
      formData.append('defectType', defectType);
      formData.append('quantity', quantity);
      formData.append('description', description);
      if (rootCauseCategoryId) formData.append('rootCauseCategoryId', rootCauseCategoryId);
      if (photo) formData.append('photo', photo);

      // Fetch automatic headers must omit Content-Type for multer boundaries
      const headers = new Headers();
      if (localStorage.getItem('accessToken')) {
        headers.set('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
      }

      const API_URL = getApiBaseUrl();
      const res = await fetch(`${API_URL}/quality/defects`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to register quality defect.');
      }

      setSuccess('Defect recorded successfully!');
      setPartNumber('');
      setDefectType('');
      setQuantity('');
      setDescription('');
      setPhoto(null);
      setRootCauseCategoryId('');
      setAiRecommendation('');
      setAiSuggestedCat(null);

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
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

  const partsOptions = ['P-GEAR-440', 'P-BRK-102', 'P-SUS-201', 'P-SFT-305'];
  const defectOptions = ['Surface Scratch', 'Dimension Deviation', 'Blowhole / Void', 'Micro-Crack', 'Thread Strip'];

  return (
    <DashboardShell>
      <div className="flex flex-col space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white">Log Quality Defect</h1>
          <p className="text-xs text-gray-400 mt-1">Register casting flaws, dimensional errors, or scrap with photo attachment tools.</p>
        </div>

        {/* Status notifications */}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Form container */}
          <div className="lg:col-span-2 glass-card rounded-xl p-8 border border-gray-800/80">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Date select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Inspection Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Plant select */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Manufacturing Plant *</label>
                    {user?.plantAccess && (
                      <span className="text-[10px] text-brand-blue font-bold">Auto-selected ({user.plantAccess.name})</span>
                    )}
                  </div>
                  <select
                    disabled={!!user?.plantAccess}
                    value={plantId}
                    onChange={(e) => setPlantId(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors disabled:opacity-80"
                  >
                    <option value="">Select Plant...</option>
                    {availablePlants.map((plant) => (
                      <option key={plant.id} value={plant.id}>{plant.name}</option>
                    ))}
                  </select>
                </div>


                {/* Line Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Production Line</label>
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

                {/* Machine Select (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Machine Asset (Optional)</label>
                  <select
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  >
                    <option value="">Not Applicable / Unknown</option>
                    {machines.map((mach: any) => (
                      <option key={mach.id} value={mach.id}>{mach.name} ({mach.code})</option>
                    ))}
                  </select>
                </div>

                {/* Part Number Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Component Part Number</label>
                  <select
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  >
                    <option value="">Select Part Number...</option>
                    {partsOptions.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>

                {/* Defect Type select */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Defect Classification</label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  >
                    <option value="">Select Classification...</option>
                    {defectOptions.map((defect) => (
                      <option key={defect} value={defect}>{defect}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Defect Quantity (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Root Cause Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Root Cause Category</label>
                  <select
                    value={rootCauseCategoryId}
                    onChange={(e) => setRootCauseCategoryId(e.target.value)}
                    className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors"
                  >
                    <option value="">Under Investigation...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description & AI Diagnostic assist */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Inspector Observations *</label>
                  <button
                    type="button"
                    onClick={handleAiDiagnose}
                    disabled={aiLoading}
                    className="flex items-center space-x-1 text-xs text-brand-cyan hover:text-white font-bold transition-all cursor-pointer"
                  >
                    {aiLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Run AI Root-Cause Assist</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe crack length, surface score depth, or blowhole bubble layout..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#080B13] border border-gray-800 focus:border-brand-blue text-xs rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Defect Photo Attachment</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-800 border-dashed rounded-lg cursor-pointer bg-[#080B13] hover:bg-gray-900/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500">
                      <Upload className="w-8 h-8 mb-2" />
                      <p className="text-xs"><span className="font-semibold text-brand-blue">Upload photo</span> or drag & drop</p>
                      <p className="text-[10px] mt-1 text-gray-600">JPEG, PNG, WebP (max 5MB)</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setPhoto(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {photo && (
                  <p className="text-xs text-brand-emerald font-semibold mt-2">
                    Attached file: {photo.name} ({Math.round(photo.size / 1024)} KB)
                  </p>
                )}
              </div>

              {/* Submit Log */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-50 text-white rounded-lg py-3 text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <ClipboardPen className="h-4.5 w-4.5" />
                    <span>Log Quality Defect</span>
                  </>
                )}
              </button>

            </form>
          </div>

          {/* AI diagnosis panel */}
          <div className="glass-card rounded-2xl border border-border-color p-6 space-y-4 min-h-[300px] shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-bold text-brand-blue uppercase tracking-wider pb-3 border-b border-border-color">
              <Sparkles className="h-4.5 w-4.5 text-brand-blue animate-pulse" />
              <span>AI Root-Cause Assistant</span>
            </div>

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-16 text-xs text-text-secondary font-semibold uppercase tracking-wider">
                <Loader2 className="h-7 w-7 text-brand-blue animate-spin" />
                <span>AI analyzing machine parameters & description...</span>
              </div>
            ) : aiRecommendation ? (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-900 leading-relaxed whitespace-pre-line font-medium shadow-inner">
                  {aiRecommendation}
                </div>

                {aiSuggestedCat && (
                  <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl flex flex-col space-y-3 shadow-xs">
                    <div>
                      <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Suggested Category Mapping:</p>
                      <p className="text-sm text-emerald-900 font-extrabold mt-0.5">{aiSuggestedCat.name}</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleApplyAiCategory}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      Apply Suggested Category
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-text-secondary font-medium leading-relaxed">
                Select part number & enter defect observations, then click <strong className="text-brand-blue">Run AI Root-Cause Assist</strong> to generate recommendations instantly.
              </div>
            )}
          </div>


        </div>

      </div>
    </DashboardShell>
  );
}
