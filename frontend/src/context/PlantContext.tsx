'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface PlantContextType {
  selectedPlantId: string; // empty string represents "All Plants"
  selectedPlantName: string;
  setSelectedPlantId: (id: string) => void;
  availablePlants: { id: string; name: string; code: string }[];
  loadingPlants: boolean;
}

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: ReactNode }) {
  const { user, apiFetch } = useAuth();
  const [selectedPlantId, setSelectedPlantIdState] = useState<string>('');
  const [selectedPlantName, setSelectedPlantName] = useState<string>('All Plants');
  const [availablePlants, setAvailablePlants] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(true);

  // Fetch plants on mount (only if user logged in)
  useEffect(() => {
    if (!user) {
      setAvailablePlants([]);
      setSelectedPlantIdState('');
      setSelectedPlantName('All Plants');
      return;
    }

    // If user has restricted plant access, lock selection to that plant
    if (user.plantAccess) {
      setSelectedPlantIdState(user.plantAccess.id);
      setSelectedPlantName(user.plantAccess.name);
      setAvailablePlants([user.plantAccess]);
      setLoadingPlants(false);
      return;
    }

    // Otherwise, fetch all plants from backend config route
    const fetchPlants = async () => {
      try {
        setLoadingPlants(true);
        const res = await apiFetch('/admin/plants');
        if (res.ok) {
          const data = await res.json();
          setAvailablePlants(data);
          // Set default to first plant or "All Plants" (empty string)
          setSelectedPlantIdState('');
          setSelectedPlantName('All Plants');
        }
      } catch (err) {
        console.error('Failed to fetch plants in context', err);
      } finally {
        setLoadingPlants(false);
      }
    };

    fetchPlants();
  }, [user]);

  const setSelectedPlantId = (id: string) => {
    if (user?.plantAccess) {
      // Plant heads / plant staff cannot change selection
      return;
    }

    setSelectedPlantIdState(id);
    if (id === '') {
      setSelectedPlantName('All Plants');
    } else {
      const match = availablePlants.find(p => p.id === id);
      setSelectedPlantName(match ? match.name : 'Unknown Plant');
    }
  };

  return (
    <PlantContext.Provider value={{
      selectedPlantId,
      selectedPlantName,
      setSelectedPlantId,
      availablePlants,
      loadingPlants
    }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlant() {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error('usePlant must be used within a PlantProvider');
  }
  return context;
}
