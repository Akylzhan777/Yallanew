import React from 'react';
import { useRegion, Region } from '../context/RegionContext';

export function useRegionContent(requiredRegion: Region | 'ANY') {
  const { region } = useRegion();
  const isVisible = requiredRegion === 'ANY' || region === requiredRegion;
  const isWrongRegion = requiredRegion !== 'ANY' && region !== requiredRegion;
  return { isVisible, isWrongRegion, currentRegion: region };
}

interface RegionGuardProps {
  region: Region | 'ANY';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RegionGuard({ region, fallback = null, children }: RegionGuardProps) {
  const { isVisible } = useRegionContent(region);
  return isVisible ? <>{children}</> : <>{fallback}</>;
}

export function useRegionUrl() {
  const { region } = useRegion();
  return (path: string): string => {
    if (region === 'KZ') {
      const cleanPath = path.replace(/^\/kz/, '');
      return `/kz${cleanPath}`;
    }
    return path;
  };
}

export function useRegionData<T>(data: Partial<Record<Region, T>>): T | undefined {
  const { region } = useRegion();
  return data[region];
}
