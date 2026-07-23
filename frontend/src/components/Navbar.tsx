'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePlant } from '@/context/PlantContext';
import { Globe, MapPin, Loader2 } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const { selectedPlantId, setSelectedPlantId, availablePlants, loadingPlants } = usePlant();

  if (!user) return null;

  // CEO and ADMIN are cross-plant and can change selection
  const canSelectPlant = user.role === 'CEO' || user.role === 'ADMIN';

  return (
    <header className="navbar-glass h-16 fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-8">
      {/* Page Context Indicator */}
      <div className="flex items-center space-x-3">
        <MapPin className="h-4 w-4 text-brand-blue" />
        <span className="text-xs text-navbar-text-muted font-medium">Active Context:</span>
        <span className="text-sm font-semibold text-navbar-text-title">
          {user.plantAccess ? user.plantAccess.name : 'Corporate Headquarters'}
        </span>
      </div>

      {/* Right-Side Operations */}
      <div className="flex items-center space-x-4">
        {/* Plant Selector */}
        <div className="flex items-center space-x-2 bg-navbar-select-bg border border-navbar-select-border px-3 py-1.5 rounded-lg">
          <Globe className="h-3.5 w-3.5 text-brand-cyan" />
          
          {loadingPlants ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-navbar-text-muted" />
          ) : canSelectPlant ? (
            <select
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              className="bg-transparent text-xs text-navbar-select-text font-semibold focus:outline-none border-none cursor-pointer pr-4"
            >
              <option value="" className="bg-navbar-option-bg text-navbar-select-text">All Plants (Cross-Plant)</option>
              {availablePlants.map((plant) => (
                <option key={plant.id} value={plant.id} className="bg-navbar-option-bg text-navbar-select-text">
                  {plant.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-navbar-select-text font-bold uppercase tracking-wider">
              {user.plantAccess?.name || 'All Plants'}
            </span>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2 bg-brand-emerald/10 border border-brand-emerald/30 px-2.5 py-1 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-emerald pulse-green"></span>
          <span className="text-[10px] text-brand-emerald font-bold tracking-wider uppercase">IoT Active</span>
        </div>
      </div>
    </header>
  );
}
